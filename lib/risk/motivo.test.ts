import { describe, expect, it } from "vitest"
import { construirMotivo, type DatosMotivo } from "./motivo"
import { PARAMETROS_RIESGO } from "./params"

const motivo = (datos: DatosMotivo) => construirMotivo(datos, PARAMETROS_RIESGO)

const casos: Array<[string, DatosMotivo, string]> = [
  [
    "sin datos",
    { nivel: null, rachaMaxima: 0, lluviaDia: 0, reglaLluviaAplicada: false },
    "Faltan datos de clima para calcular el semáforo de este día.",
  ],
  [
    "mucha lluvia",
    { nivel: "poco_favorable", rachaMaxima: 12, lluviaDia: 21.7, reglaLluviaAplicada: true },
    "Mucha lluvia (21.7 mm): con 10 mm o más el semáforo no marca este día como favorable.",
  ],
  [
    "poco favorable",
    { nivel: "poco_favorable", rachaMaxima: 5, lluviaDia: 0.9, reglaLluviaAplicada: false },
    "El clima ayuda poco a que la roya avance: solo 5 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C, y hacen falta al menos 6 horas.",
  ],
  [
    "favorable",
    { nivel: "favorable", rachaMaxima: 8, lluviaDia: 5.4, reglaLluviaAplicada: false },
    "El clima ayuda a que la roya avance: 8 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C y 5.4 mm de lluvia.",
  ],
  [
    "muy favorable",
    { nivel: "muy_favorable", rachaMaxima: 11, lluviaDia: 2.4, reglaLluviaAplicada: false },
    "El clima ayuda mucho a que la roya avance: 11 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C y 2.4 mm de lluvia.",
  ],
]

describe("construirMotivo", () => {
  it.each(casos)("redacta el motivo: %s", (_nombre, datos, esperado) => {
    expect(motivo(datos)).toBe(esperado)
  })

  it("dice que no hay horas seguidas cuando la racha es 0", () => {
    expect(motivo({ nivel: "poco_favorable", rachaMaxima: 0, lluviaDia: 0, reglaLluviaAplicada: false })).toBe(
      "El clima ayuda poco a que la roya avance: no hay horas seguidas de hoja húmeda (estimada) con 22 a 25 °C.",
    )
  })

  it("usa el singular con una sola hora", () => {
    expect(motivo({ nivel: "poco_favorable", rachaMaxima: 1, lluviaDia: 0, reglaLluviaAplicada: false })).toContain(
      "solo 1 hora seguida de hoja húmeda",
    )
  })

  it("usa los parámetros recibidos en las cifras del texto", () => {
    const parametros = { ...PARAMETROS_RIESGO, lluviaDiariaMax: 15 }
    expect(
      construirMotivo({ nivel: "poco_favorable", rachaMaxima: 3, lluviaDia: 16, reglaLluviaAplicada: true }, parametros),
    ).toBe("Mucha lluvia (16 mm): con 15 mm o más el semáforo no marca este día como favorable.")
  })

  it.each(casos)("es una sola frase y evita palabras prohibidas: %s", (_nombre, datos) => {
    const texto = motivo(datos)
    // Un punto o signo que cierra frase solo puede ir al final; los decimales (21.7) no cuentan.
    expect(texto.match(/[.!?](\s|$)/g)).toHaveLength(1)
    expect(texto.endsWith(".")).toBe(true)
    expect(texto).not.toMatch(/probabilidad|diagn[oó]stic|\bhoy\b|estuvo|estuvieron|favorable para la roya/i)
  })
})
