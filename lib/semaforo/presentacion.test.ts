import { describe, expect, it } from "vitest"

import type { NivelRiesgo } from "@/lib/risk/types"

import {
  CREDITO_CLIMA,
  NIVELES_PRESENTACION,
  TEXTOS_SEMAFORO,
  formatearFecha,
  vistaDelRiesgo,
} from "./presentacion"

const NIVELES = Object.keys(NIVELES_PRESENTACION) as NivelRiesgo[]

// Contraste WCAG entre dos colores hexadecimales.
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

describe("NIVELES_PRESENTACION", () => {
  it("los tres niveles tienen la etiqueta y el color acordados", () => {
    expect(NIVELES_PRESENTACION.poco_favorable).toMatchObject({ etiqueta: "Poco favorable", color: "verde" })
    expect(NIVELES_PRESENTACION.favorable).toMatchObject({ etiqueta: "Favorable", color: "amarillo" })
    expect(NIVELES_PRESENTACION.muy_favorable).toMatchObject({ etiqueta: "Muy favorable", color: "rojo" })
  })

  it("cada nivel tiene un icono distinto (no depende solo del color)", () => {
    const iconos = NIVELES.map((nivel) => NIVELES_PRESENTACION[nivel].icono)
    expect(new Set(iconos).size).toBe(3)
  })

  it("los textos de qué hacer son los acordados", () => {
    expect(NIVELES_PRESENTACION.poco_favorable.queHacer).toBe("Revisa tus hojas con tu rutina de siempre.")
    expect(NIVELES_PRESENTACION.favorable.queHacer).toBe("Revisa tus hojas esta semana.")
    expect(NIVELES_PRESENTACION.muy_favorable.queHacer).toBe(
      "Revisa tus hojas pronto. Si ves manchas amarillas o polvo anaranjado en el envés, consulta a un técnico.",
    )
  })

  it("etiquetas y qué hacer no usan «hoy», «probabilidad» ni «diagnóstico»", () => {
    for (const nivel of NIVELES) {
      const { etiqueta, queHacer } = NIVELES_PRESENTACION[nivel]
      expect(`${etiqueta} ${queHacer}`).not.toMatch(/\bhoy\b|probabilidad|diagn[oó]stic/i)
    }
  })

  it("ningún texto fijo habla de probabilidad ni de diagnóstico", () => {
    const fijos = [
      TEXTOS_SEMAFORO.titulo,
      TEXTOS_SEMAFORO.cargando,
      TEXTOS_SEMAFORO.sinZona,
      TEXTOS_SEMAFORO.errorLectura,
      TEXTOS_SEMAFORO.notaDatoDeAyer,
      TEXTOS_SEMAFORO.sinDato("Saposoa"),
      TEXTOS_SEMAFORO.estimacion("Saposoa"),
      TEXTOS_SEMAFORO.datoDelDia("11 de noviembre"),
      TEXTOS_SEMAFORO.datoVencido("9 de noviembre"),
    ]
    for (const texto of fijos) expect(texto).not.toMatch(/probabilidad|diagn[oó]stic/i)
  })

  it("el color del texto contrasta al menos 4.5:1 con el fondo y el borde 3:1", () => {
    for (const nivel of NIVELES) {
      const { fondo, texto, borde, barra } = NIVELES_PRESENTACION[nivel].colores
      expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5)
      expect(contraste(borde, fondo)).toBeGreaterThanOrEqual(3)
      expect(contraste(barra, fondo)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe("textos fijos", () => {
  it("avisa que es una estimación de la zona, no una medición de la parcela", () => {
    expect(TEXTOS_SEMAFORO.estimacion("Saposoa")).toBe(
      "Estimación para la zona Saposoa (unos 9 km a la redonda). No es una medición de tu parcela.",
    )
  })

  it("el crédito de Open-Meteo enlaza al sitio y a la licencia CC BY 4.0", () => {
    expect(CREDITO_CLIMA.texto).toBe("Weather data by Open-Meteo.com")
    expect(CREDITO_CLIMA.url).toBe("https://open-meteo.com/")
    expect(CREDITO_CLIMA.licencia).toBe("CC BY 4.0")
    expect(CREDITO_CLIMA.urlLicencia).toBe("https://creativecommons.org/licenses/by/4.0/")
  })

  it("la nota del dato de ayer es la acordada", () => {
    expect(TEXTOS_SEMAFORO.notaDatoDeAyer).toBe("El de hoy se calcula alrededor de las 6 a. m.")
  })
})

describe("formatearFecha", () => {
  it("escribe el día y el mes sin desfase", () => {
    expect(formatearFecha("2026-11-11")).toBe("11 de noviembre")
    expect(formatearFecha("2026-01-01")).toBe("1 de enero")
    expect(formatearFecha("2026-12-31")).toBe("31 de diciembre")
  })
})

describe("vistaDelRiesgo", () => {
  const base = {
    fecha: "2026-11-11",
    nivel: "favorable" as const,
    indice: 0.62,
    motivo: "Frase tal cual de riesgo_diario.",
    detalle: { rachaMaxima: 7, horasHojaHumeda: 9, lluviaDia: 3.4, parametros: {} },
  }

  it("deja el motivo igual y calcula la barra", () => {
    const vista = vistaDelRiesgo(base)
    expect(vista.motivo).toBe("Frase tal cual de riesgo_diario.")
    expect(vista.indicePorcentaje).toBe(62)
    expect(vista.fechaTexto).toBe("11 de noviembre")
    expect(vista.presentacion.etiqueta).toBe("Favorable")
  })

  it("toma racha, horas de hoja húmeda y lluvia del detalle", () => {
    expect(vistaDelRiesgo(base)).toMatchObject({ rachaMaxima: 7, horasHojaHumeda: 9, lluviaDia: 3.4 })
  })

  it("si el detalle falta o viene incompleto, esos datos quedan en null", () => {
    expect(vistaDelRiesgo({ ...base, detalle: null })).toMatchObject({
      rachaMaxima: null,
      horasHojaHumeda: null,
      lluviaDia: null,
    })
    expect(vistaDelRiesgo({ ...base, detalle: { rachaMaxima: "7" } }).rachaMaxima).toBeNull()
  })

  it("no expone temperatura ni humedad", () => {
    expect(Object.keys(vistaDelRiesgo(base))).not.toEqual(expect.arrayContaining(["temperatura"]))
    expect(Object.keys(vistaDelRiesgo(base))).not.toEqual(expect.arrayContaining(["humedad"]))
  })

  it("el índice se limita entre 0 y 1", () => {
    expect(vistaDelRiesgo({ ...base, indice: 1.4 }).indicePorcentaje).toBe(100)
    expect(vistaDelRiesgo({ ...base, indice: -1 }).indicePorcentaje).toBe(0)
  })
})
