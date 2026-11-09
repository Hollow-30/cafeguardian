import { construirMotivo } from "./motivo"
import { PARAMETROS_RIESGO } from "./params"
import type { EntradaRiesgo, HoraClima, NivelRiesgo, ParametrosRiesgo, ResultadoRiesgo } from "./types"

type HoraCompleta = HoraClima & { temperatura: number; humedad: number; lluvia: number }

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORAS_POR_DIA = 24

const esNumero = (valor: number | null): valor is number => typeof valor === "number" && Number.isFinite(valor)

const estaCompleta = (hora: HoraClima | undefined): hora is HoraCompleta =>
  hora !== undefined && esNumero(hora.temperatura) && esNumero(hora.humedad) && esNumero(hora.lluvia)

function redondear(valor: number, decimales: number) {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

function fechaValida(fecha: string) {
  if (!FORMATO_FECHA.test(fecha)) return false
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia)).toISOString().slice(0, 10) === fecha
}

function diaAnterior(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10)
}

function nivelDesdeIndice(indice: number, parametros: Readonly<ParametrosRiesgo>): NivelRiesgo {
  if (indice < parametros.corteFavorable) return "poco_favorable"
  if (indice < parametros.corteMuyFavorable) return "favorable"
  return "muy_favorable"
}

/**
 * Regla B: el índice crece con la racha de horas favorables seguidas del día
 * (racha / horasParaIndiceMaximo, con tope 1). Una hora es favorable si la temperatura está en
 * rango y la hoja está húmeda (estimada: humedad alta o lluvia en esa hora).
 *
 * Función pura: no usa red, base de datos, reloj ni azar, y no modifica lo que recibe.
 * Una hora que falta o viene incompleta corta la racha. Si el día evaluado tiene menos de
 * `horasMinimasConDato` horas completas, devuelve nivel e índice `null` en vez de inventarlos.
 */
export function calcularRiesgo(
  entrada: EntradaRiesgo,
  parametros: Readonly<ParametrosRiesgo> = PARAMETROS_RIESGO,
): ResultadoRiesgo {
  const { fecha } = entrada
  if (!fechaValida(fecha)) {
    throw new Error("La fecha debe tener el formato AAAA-MM-DD y ser un día real.")
  }

  // Una hora por clave "AAAA-MM-DDTHH"; si se repite, gana la última. No se ordena ni se modifica la entrada.
  const porHora = new Map<string, HoraClima>()
  for (const hora of entrada.horas) {
    porHora.set(hora.tiempo.slice(0, 13), hora)
  }

  let racha = 0
  let rachaMaxima = 0
  let horasConDato = 0
  let horasTemperatura = 0
  let horasHojaHumeda = 0
  let lluviaAcumulada = 0

  // Se recorren las 48 horas del día anterior y del día evaluado, para que la racha cruce la medianoche.
  for (const dia of [diaAnterior(fecha), fecha]) {
    for (let h = 0; h < HORAS_POR_DIA; h++) {
      const hora = porHora.get(`${dia}T${String(h).padStart(2, "0")}`)
      if (!estaCompleta(hora)) {
        racha = 0
        continue
      }

      const temperatura = hora.temperatura >= parametros.temperaturaMin && hora.temperatura <= parametros.temperaturaMax
      const hojaHumeda = hora.humedad > parametros.humedadMin || hora.lluvia > 0
      racha = temperatura && hojaHumeda ? racha + 1 : 0

      if (dia !== fecha) continue
      horasConDato++
      if (temperatura) horasTemperatura++
      if (hojaHumeda) horasHojaHumeda++
      lluviaAcumulada += hora.lluvia
      rachaMaxima = Math.max(rachaMaxima, racha)
    }
  }

  // La regla compara con 2 decimales para no confundir 9.96 con 10; `lluviaDia` (1 decimal) es solo para mostrar.
  const lluviaDia = redondear(lluviaAcumulada, 1)
  const reglaLluviaAplicada = parametros.aplicarReglaLluvia && redondear(lluviaAcumulada, 2) >= parametros.lluviaDiariaMax
  const detalle = {
    fecha,
    horasConDato,
    horasSinDato: HORAS_POR_DIA - horasConDato,
    horasTemperatura,
    horasHojaHumeda,
    rachaMaxima,
    lluviaDia,
    reglaLluviaAplicada,
    parametros: { ...parametros },
  }

  if (horasConDato < parametros.horasMinimasConDato) {
    const motivo = construirMotivo({ nivel: null, rachaMaxima, lluviaDia, reglaLluviaAplicada: false }, parametros)
    return { nivel: null, indice: null, motivo, detalle: { ...detalle, reglaLluviaAplicada: false } }
  }

  const indiceExacto = reglaLluviaAplicada ? 0 : Math.min(1, rachaMaxima / parametros.horasParaIndiceMaximo)
  const nivel = nivelDesdeIndice(indiceExacto, parametros)
  const motivo = construirMotivo({ nivel, rachaMaxima, lluviaDia, reglaLluviaAplicada }, parametros)

  return { nivel, indice: redondear(indiceExacto, 2), motivo, detalle }
}
