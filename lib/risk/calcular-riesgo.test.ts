import { describe, expect, it } from "vitest"
import { calcularRiesgo } from "./calcular-riesgo"
import { PARAMETROS_RIESGO } from "./params"
import type { HoraClima } from "./types"

const FECHA = "2026-11-07"
const ANTERIOR = "2026-11-06"
const SIGUIENTE = "2026-11-08"

type Valores = Pick<HoraClima, "temperatura" | "humedad" | "lluvia">

const FAVORABLE: Valores = { temperatura: 23, humedad: 95, lluvia: 0 }
const FRIA: Valores = { temperatura: 18, humedad: 95, lluvia: 0 }

const hora = (dia: string, h: number, valores: Valores): HoraClima => ({
  tiempo: `${dia}T${String(h).padStart(2, "0")}:00`,
  ...valores,
})

// Día completo: las primeras `n` horas son favorables y el resto frías.
const diaConRacha = (dia: string, n: number) =>
  Array.from({ length: 24 }, (_, h) => hora(dia, h, h < n ? FAVORABLE : FRIA))

// Día completo con los mismos valores en las 24 horas.
const diaUniforme = (dia: string, valores: Valores) => Array.from({ length: 24 }, (_, h) => hora(dia, h, valores))

const calcular = (horas: HoraClima[], parametros = PARAMETROS_RIESGO) => calcularRiesgo({ fecha: FECHA, horas }, parametros)

function congelar<T>(valor: T): T {
  if (valor !== null && typeof valor === "object") {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

describe("calcularRiesgo: un caso por nivel", () => {
  it("poco favorable con 5 horas seguidas (índice 0.42)", () => {
    const r = calcular(diaConRacha(FECHA, 5))
    expect(r.nivel).toBe("poco_favorable")
    expect(r.indice).toBe(0.42)
    expect(r.detalle.rachaMaxima).toBe(5)
  })

  it("favorable con 7 horas seguidas (índice 0.58)", () => {
    const r = calcular(diaConRacha(FECHA, 7))
    expect(r.nivel).toBe("favorable")
    expect(r.indice).toBe(0.58)
  })

  it("muy favorable con 11 horas seguidas (índice 0.92)", () => {
    const r = calcular(diaConRacha(FECHA, 11))
    expect(r.nivel).toBe("muy_favorable")
    expect(r.indice).toBe(0.92)
  })

  it.each([
    [0, "poco_favorable", 0],
    [6, "favorable", 0.5],
    [8, "favorable", 0.67],
    [9, "muy_favorable", 0.75],
    [12, "muy_favorable", 1],
    [24, "muy_favorable", 1],
  ])("racha de %i horas: %s con índice %f", (n, nivel, indice) => {
    const r = calcular(diaConRacha(FECHA, n))
    expect(r.nivel).toBe(nivel)
    expect(r.indice).toBe(indice)
  })
})

describe("calcularRiesgo: bordes", () => {
  it.each([
    [22, 1],
    [25, 1],
    [21.9, 0],
    [25.1, 0],
  ])("temperatura %f en las 24 horas da índice %f", (temperatura, indice) => {
    expect(calcular(diaUniforme(FECHA, { temperatura, humedad: 95, lluvia: 0 })).indice).toBe(indice)
  })

  it.each([
    [90, 0],
    [90.1, 1],
  ])("humedad %f sin lluvia da índice %f", (humedad, indice) => {
    expect(calcular(diaUniforme(FECHA, { temperatura: 23, humedad, lluvia: 0 })).indice).toBe(indice)
  })

  it("la lluvia de una hora cuenta como hoja húmeda aunque la humedad sea baja", () => {
    const r = calcular(diaUniforme(FECHA, { temperatura: 23, humedad: 70, lluvia: 0.1 }))
    expect(r.detalle.horasHojaHumeda).toBe(24)
    expect(r.indice).toBe(1)
  })

  it("exactamente 10 mm en el día deja el índice en 0", () => {
    const horas = Array.from({ length: 24 }, (_, h) => hora(FECHA, h, { ...FAVORABLE, lluvia: h < 10 ? 1 : 0 }))
    const r = calcular(horas)
    expect(r.detalle.lluviaDia).toBe(10)
    expect(r.detalle.reglaLluviaAplicada).toBe(true)
    expect(r.indice).toBe(0)
    expect(r.nivel).toBe("poco_favorable")
  })

  it("9.9 mm en el día no aplica la regla de lluvia", () => {
    const horas = Array.from({ length: 24 }, (_, h) => hora(FECHA, h, { ...FAVORABLE, lluvia: h < 11 ? 0.9 : 0 }))
    const r = calcular(horas)
    expect(r.detalle.lluviaDia).toBe(9.9)
    expect(r.detalle.reglaLluviaAplicada).toBe(false)
    expect(r.indice).toBe(1)
  })

  it("con aplicarReglaLluvia apagado, 21.7 mm ya no anulan el índice", () => {
    const horas = Array.from({ length: 24 }, (_, h) => hora(FECHA, h, { ...FAVORABLE, lluvia: h < 7 ? 3.1 : 0 }))
    expect(calcular(horas).indice).toBe(0)
    const sinRegla = calcular(horas, { ...PARAMETROS_RIESGO, aplicarReglaLluvia: false })
    expect(sinRegla.detalle.lluviaDia).toBe(21.7)
    expect(sinRegla.indice).toBe(1)
  })
})

describe("calcularRiesgo: racha que cruza la medianoche", () => {
  const ultimasHoras = (dia: string, n: number) =>
    Array.from({ length: 24 }, (_, h) => hora(dia, h, h >= 24 - n ? FAVORABLE : FRIA))

  it("suma 4 horas del día anterior y 4 del día evaluado", () => {
    const r = calcular([...ultimasHoras(ANTERIOR, 4), ...diaConRacha(FECHA, 4)])
    expect(r.detalle.rachaMaxima).toBe(8)
    expect(r.nivel).toBe("favorable")
  })

  it("sin el día anterior, esas 4 horas solas no alcanzan", () => {
    expect(calcular(diaConRacha(FECHA, 4)).nivel).toBe("poco_favorable")
  })

  it("una racha que termina el día anterior no cuenta para el día evaluado", () => {
    const r = calcular([...ultimasHoras(ANTERIOR, 12), ...diaConRacha(FECHA, 0)])
    expect(r.detalle.rachaMaxima).toBe(0)
  })

  it("ignora las horas de días posteriores", () => {
    const finalDelDia = Array.from({ length: 24 }, (_, h) => hora(FECHA, h, h >= 19 ? FAVORABLE : FRIA))
    const r = calcular([...finalDelDia, ...diaConRacha(SIGUIENTE, 9)])
    expect(r.detalle.rachaMaxima).toBe(5)
  })
})

describe("calcularRiesgo: datos faltantes", () => {
  it("devuelve nivel e índice null si el día tiene 17 horas con dato", () => {
    const r = calcular(diaConRacha(FECHA, 24).slice(0, 17))
    expect(r.nivel).toBeNull()
    expect(r.indice).toBeNull()
    expect(r.detalle.horasConDato).toBe(17)
    expect(r.detalle.horasSinDato).toBe(7)
    expect(r.motivo).toBe("Faltan datos de clima para calcular el semáforo de este día.")
  })

  it("calcula con 18 horas con dato", () => {
    const r = calcular(diaConRacha(FECHA, 24).slice(0, 18))
    expect(r.nivel).toBe("muy_favorable")
    expect(r.detalle.horasConDato).toBe(18)
  })

  it("devuelve null si no llega ninguna hora", () => {
    expect(calcular([]).nivel).toBeNull()
  })

  it("un dato null corta la racha", () => {
    const horas = diaConRacha(FECHA, 11).map((h, i) => (i === 5 ? { ...h, humedad: null } : h))
    const r = calcular(horas)
    expect(r.detalle.horasConDato).toBe(23)
    expect(r.detalle.rachaMaxima).toBe(5)
    expect(r.nivel).toBe("poco_favorable")
  })

  it("una hora que falta en la lista también corta la racha", () => {
    const horas = diaConRacha(FECHA, 11).filter((_, i) => i !== 5)
    expect(calcular(horas).detalle.rachaMaxima).toBe(5)
  })

  it("una hora repetida no se cuenta dos veces", () => {
    const horas = diaConRacha(FECHA, 7)
    const r = calcular([...horas, ...horas])
    expect(r.detalle.horasConDato).toBe(24)
    expect(r.detalle.rachaMaxima).toBe(7)
  })

  it("un valor no numérico cuenta como dato faltante", () => {
    const horas = diaConRacha(FECHA, 24).map((h, i) => (i === 0 ? { ...h, temperatura: Number.NaN } : h))
    expect(calcular(horas).detalle.horasConDato).toBe(23)
  })
})

describe("calcularRiesgo: detalle y validación", () => {
  it("cuenta las horas del día y copia los parámetros usados", () => {
    const r = calcular(diaConRacha(FECHA, 7))
    expect(r.detalle).toEqual({
      fecha: FECHA,
      horasConDato: 24,
      horasSinDato: 0,
      horasTemperatura: 7,
      horasHojaHumeda: 24,
      rachaMaxima: 7,
      lluviaDia: 0,
      reglaLluviaAplicada: false,
      parametros: PARAMETROS_RIESGO,
    })
  })

  it.each(["07/11/2026", "2026-13-01", "2026-02-30", ""])("rechaza la fecha %j", (fecha) => {
    expect(() => calcularRiesgo({ fecha, horas: [] })).toThrow(/fecha/i)
  })
})

describe("calcularRiesgo: pureza", () => {
  const horas = [...diaConRacha(ANTERIOR, 24), ...diaConRacha(FECHA, 9)]

  it("misma entrada, misma salida", () => {
    expect(calcular(horas)).toEqual(calcular(horas))
  })

  it("no cambia con el orden de las horas", () => {
    expect(calcular([...horas].reverse())).toEqual(calcular(horas))
  })

  it("no modifica la entrada ni los parámetros", () => {
    const antes = JSON.stringify(horas)
    const entrada = congelar({ fecha: FECHA, horas: JSON.parse(antes) as HoraClima[] })
    const parametros = congelar({ ...PARAMETROS_RIESGO })
    expect(() => calcularRiesgo(entrada, parametros)).not.toThrow()
    expect(JSON.stringify(entrada.horas)).toBe(antes)
  })

  it("el resultado no comparte los parámetros con el objeto exportado", () => {
    const r = calcular(horas)
    r.detalle.parametros.temperaturaMin = 0
    expect(PARAMETROS_RIESGO.temperaturaMin).toBe(22)
  })
})
