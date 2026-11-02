// HU-19 (CAFG-110): baja 14 días de clima por hora desde Open-Meteo y cuenta
// las horas dentro de los rangos del modelo de infección de roya.
// Script exploratorio, sin dependencias. Uso:
//   node scripts/semaforo/clima-saposoa.mjs [--lat -6.93] [--lon -76.77] [--json]
//
// Las funciones de cálculo son puras (sin red) para llevarlas después a lib/risk.

import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

export const LAT_SAPOSOA = -6.935035721896322
export const LON_SAPOSOA = -76.77095139528569

// SENAMHI, no los específicos de roya de Magarey. Todos están "a validar".
export const PARAMS = {
  tempMin: 22, // °C, incluido
  tempMax: 25, // °C, incluido
  humedadMin: 90, // %, la condición es estrictamente mayor
  lluviaDiariaMax: 10, // mm por día, estrictamente menor (supuesto a validar)
  horasMojadoMin: 6, // horas seguidas
}

const ZONA_HORARIA = 'America/Lima'
const URL_API = 'https://api.open-meteo.com/v1/forecast'

// Hoja mojada: heurística propia, no es un dato medido. Open-Meteo no la entrega.
// Se asume mojada si hay humedad alta o lluvia en esa hora (supuesto a validar).
// Ojo: depende de la humedad, así que no es independiente de la condición HR > 90.
export function clasificarHora(hora, params = PARAMS) {
  const completa = [hora.temp, hora.humedad, hora.lluvia].every(
    (v) => typeof v === 'number' && Number.isFinite(v),
  )
  if (!completa) {
    return { sinDato: true, temp: false, humedad: false, mojada: false, favorable: false }
  }
  const temp = hora.temp >= params.tempMin && hora.temp <= params.tempMax
  const humedad = hora.humedad > params.humedadMin
  const mojada = humedad || hora.lluvia > 0
  return { sinDato: false, temp, humedad, mojada, favorable: temp && mojada }
}

// Agrupa por día. La racha de horas favorables seguidas puede cruzar la
// medianoche: se le asigna al día en que termina.
export function resumirDias(horas, params = PARAMS) {
  const dias = new Map()
  let racha = 0
  for (const hora of horas) {
    const dia = hora.tiempo.slice(0, 10)
    if (!dias.has(dia)) {
      dias.set(dia, {
        dia,
        horasTemp: 0,
        horasHumedad: 0,
        horasMojada: 0,
        horasFavorables: 0,
        rachaMaxima: 0,
        lluviaDia: 0,
        lluviaMaxHora: 0,
        horasSinDato: 0,
      })
    }
    const resumen = dias.get(dia)
    const c = clasificarHora(hora, params)
    if (c.sinDato) {
      resumen.horasSinDato++
      racha = 0
      continue
    }
    if (c.temp) resumen.horasTemp++
    if (c.humedad) resumen.horasHumedad++
    if (c.mojada) resumen.horasMojada++
    if (c.favorable) resumen.horasFavorables++
    resumen.lluviaDia += hora.lluvia
    resumen.lluviaMaxHora = Math.max(resumen.lluviaMaxHora, hora.lluvia)
    racha = c.favorable ? racha + 1 : 0
    resumen.rachaMaxima = Math.max(resumen.rachaMaxima, racha)
  }
  return [...dias.values()].map((d) => ({
    ...d,
    lluviaDia: Math.round(d.lluviaDia * 10) / 10,
    diaFavorable: d.rachaMaxima >= params.horasMojadoMin && d.lluviaDia < params.lluviaDiariaMax,
  }))
}

// Convierte la respuesta de Open-Meteo en una lista de horas. Falla si viene incompleta.
export function parsearRespuesta(json) {
  const h = json?.hourly
  const t = h?.time
  const series = [h?.temperature_2m, h?.relative_humidity_2m, h?.precipitation]
  if (!Array.isArray(t) || series.some((s) => !Array.isArray(s) || s.length !== t.length)) {
    throw new Error('Respuesta de Open-Meteo incompleta: faltan series o tienen distinto largo')
  }
  return t.map((tiempo, i) => ({
    tiempo,
    temp: series[0][i],
    humedad: series[1][i],
    lluvia: series[2][i],
  }))
}

async function pedir(lat, lon, forecastDays) {
  const url = new URL(URL_API)
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation',
    past_days: '14',
    forecast_days: String(forecastDays),
    timezone: ZONA_HORARIA,
  }).toString()
  const res = await fetch(url)
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '')
    throw new Error(`Open-Meteo respondió ${res.status}: ${cuerpo.slice(0, 200)}`)
  }
  return res.json()
}

// Intenta forecast_days=0; si falla, usa 1 y descarta las horas de hoy.
async function bajarClima(lat, lon) {
  try {
    const horas = parsearRespuesta(await pedir(lat, lon, 0))
    return { horas, aviso: 'forecast_days=0 funcionó' }
  } catch (err) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA })
    const horas = parsearRespuesta(await pedir(lat, lon, 1)).filter(
      (h) => h.tiempo.slice(0, 10) < hoy,
    )
    return {
      horas,
      aviso: `forecast_days=0 falló (${err.message}); se usó forecast_days=1 y se descartó hoy (${hoy})`,
    }
  }
}

function imprimirTabla(dias) {
  const columnas = ['día', 'T', 'HR', 'mojada', 'T+mojada', 'racha', 'lluvia', 'máx/h', 'sin dato', 'favorable']
  console.log(columnas.join('\t'))
  for (const d of dias) {
    console.log(
      [
        d.dia,
        d.horasTemp,
        d.horasHumedad,
        d.horasMojada,
        d.horasFavorables,
        d.rachaMaxima,
        d.lluviaDia,
        d.lluviaMaxHora,
        d.horasSinDato,
        d.diaFavorable ? 'sí' : 'no',
      ].join('\t'),
    )
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      lat: { type: 'string', default: String(LAT_SAPOSOA) },
      lon: { type: 'string', default: String(LON_SAPOSOA) },
      json: { type: 'boolean', default: false },
    },
  })
  const lat = Number(values.lat)
  const lon = Number(values.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error('--lat y --lon deben ser números válidos')
  }

  const { horas, aviso } = await bajarClima(lat, lon)
  const dias = resumirDias(horas)
  const sinDato = dias.reduce((s, d) => s + d.horasSinDato, 0)
  const meta = { lat, lon, horas: horas.length, dias: dias.length, horasSinDato: sinDato, aviso, params: PARAMS }

  if (values.json) {
    console.log(JSON.stringify({ meta, dias }, null, 2))
    return
  }
  console.error(aviso)
  console.log(`Ubicación: ${lat}, ${lon} · ${horas.length} horas en ${dias.length} días · ${sinDato} horas sin dato`)
  console.log(`Parámetros: ${JSON.stringify(PARAMS)}`)
  imprimirTabla(dias)
  console.log(`Días favorables: ${dias.filter((d) => d.diaFavorable).length} de ${dias.length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
