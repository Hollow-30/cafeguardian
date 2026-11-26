import { describe, expect, it } from "vitest"

import type { NivelRiesgo } from "@/lib/risk/types"

import {
  CREDITO_CLIMA,
  TEXTOS_ANTIGUEDAD,
  antiguedadDelDato,
  NIVELES_PRESENTACION,
  TEXTOS_AVISO,
  TEXTOS_SEMAFORO,
  TEXTOS_ZONA,
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

describe("TEXTOS_ZONA", () => {
  it("ningún texto del selector usa «probabilidad», «diagnóstico» ni «hoy»", () => {
    const textos = Object.values(TEXTOS_ZONA).map((texto) =>
      typeof texto === "function" ? texto("Saposoa") : texto,
    )
    expect(textos.length).toBeGreaterThan(5)
    for (const texto of textos) expect(texto).not.toMatch(/\bhoy\b|probabilidad|diagn[oó]stic/i)
  })

  it("el botón para abrir el selector dice «Cambiar zona»", () => {
    expect(TEXTOS_ZONA.cambiar).toBe("Cambiar zona")
    expect(TEXTOS_ZONA.guardando).toBe("Guardando…")
  })
})

describe("TEXTOS_AVISO", () => {
  const textos = () =>
    Object.values(TEXTOS_AVISO).map((texto) => (typeof texto === "function" ? texto("Saposoa") : texto))

  it("ningún texto del aviso usa «probabilidad», «diagnóstico» ni «hoy»", () => {
    expect(textos().length).toBeGreaterThan(8)
    for (const texto of textos()) expect(texto).not.toMatch(/\bhoy\b|probabilidad|diagn[oó]stic/i)
  })

  it("los textos son los acordados", () => {
    expect(TEXTOS_AVISO.franjaTitulo("Poco favorable")).toBe("Semáforo de tu zona: Poco favorable")
    expect(TEXTOS_AVISO.etiquetaBloque("Saposoa")).toBe("SEMÁFORO DE TU ZONA · Saposoa")
    expect(TEXTOS_AVISO.verSemaforo).toBe("Ver semáforo")
    expect(TEXTOS_AVISO.verSemaforoCompleto).toBe("Ver semáforo completo")
    expect(TEXTOS_AVISO.cerrar).toBe("Cerrar aviso")
    expect(TEXTOS_AVISO.invitacionEtiqueta).toBe("SEMÁFORO DE ROYA")
    expect(TEXTOS_AVISO.invitacionTitulo).toBe("Elige tu zona para ver el semáforo")
    expect(TEXTOS_AVISO.invitacionBoton).toBe("Elegir mi zona")
    expect(TEXTOS_AVISO.invitacionDescripcion).toBe(
      "Elige la zona más cercana a tu finca y verás cómo está el clima para la roya.",
    )
  })
})

describe("antiguedadDelDato", () => {
  const AHORA = new Date("2026-11-24T12:00:00Z")
  const MIN = 60_000
  const HORA = 60 * MIN
  const DIA = 24 * HORA
  const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString()

  it("menos de 1 hora", () => {
    expect(antiguedadDelDato(hace(0), AHORA)).toBe("Calculado hace menos de 1 hora")
    expect(antiguedadDelDato(hace(59 * MIN), AHORA)).toBe("Calculado hace menos de 1 hora")
    expect(antiguedadDelDato(hace(59 * MIN + 59_000), AHORA)).toBe("Calculado hace menos de 1 hora")
  })

  it("1 hora, en singular", () => {
    expect(antiguedadDelDato(hace(HORA), AHORA)).toBe("Calculado hace 1 hora")
    expect(antiguedadDelDato(hace(119 * MIN), AHORA)).toBe("Calculado hace 1 hora")
  })

  it("de 2 a 47 horas, en horas enteras (hacia abajo)", () => {
    expect(antiguedadDelDato(hace(2 * HORA), AHORA)).toBe("Calculado hace 2 horas")
    expect(antiguedadDelDato(hace(31 * HORA), AHORA)).toBe("Calculado hace 31 horas")
    expect(antiguedadDelDato(hace(31 * HORA + 59 * MIN), AHORA)).toBe("Calculado hace 31 horas")
    expect(antiguedadDelDato(hace(47 * HORA + 59 * MIN), AHORA)).toBe("Calculado hace 47 horas")
  })

  it("desde 48 horas, en días enteros (hacia abajo)", () => {
    expect(antiguedadDelDato(hace(48 * HORA), AHORA)).toBe("Calculado hace 2 días")
    expect(antiguedadDelDato(hace(71 * HORA + 59 * MIN), AHORA)).toBe("Calculado hace 2 días")
    expect(antiguedadDelDato(hace(72 * HORA), AHORA)).toBe("Calculado hace 3 días")
    expect(antiguedadDelDato(hace(10 * DIA + 5 * HORA), AHORA)).toBe("Calculado hace 10 días")
  })

  it("el singular de días existe aunque con el umbral de 48 horas no se alcance", () => {
    expect(TEXTOS_ANTIGUEDAD.dias(1)).toBe("Calculado hace 1 día")
    expect(TEXTOS_ANTIGUEDAD.horas(1)).toBe("Calculado hace 1 hora")
  })

  it("entiende el formato que devuelve Supabase (microsegundos y desfase)", () => {
    expect(antiguedadDelDato("2026-11-23T04:59:03.123456+00:00", AHORA)).toBe("Calculado hace 31 horas")
    // 00:00 en Lima (-05:00) del 23-nov = 05:00Z.
    expect(antiguedadDelDato("2026-11-23T00:00:00-05:00", AHORA)).toBe("Calculado hace 31 horas")
  })

  it("fecha futura (reloj desfasado): null", () => {
    expect(antiguedadDelDato(new Date(AHORA.getTime() + MIN).toISOString(), AHORA)).toBeNull()
    expect(antiguedadDelDato(new Date(AHORA.getTime() + 5 * DIA).toISOString(), AHORA)).toBeNull()
  })

  it("nulo, ausente o inválido: null", () => {
    for (const valor of [null, undefined, "", "   ", "no es una fecha", "2026-13-45T00:00:00Z", "2026-11-23", "31"]) {
      expect(antiguedadDelDato(valor, AHORA)).toBeNull()
    }
  })

  it("una hora actual inválida: null", () => {
    expect(antiguedadDelDato(hace(HORA), new Date("no es una fecha"))).toBeNull()
  })

  it("ningún texto usa «hoy», «probabilidad» ni «diagnóstico»", () => {
    const textos = [
      TEXTOS_ANTIGUEDAD.menosDeUnaHora,
      TEXTOS_ANTIGUEDAD.horas(1),
      TEXTOS_ANTIGUEDAD.horas(31),
      TEXTOS_ANTIGUEDAD.dias(1),
      TEXTOS_ANTIGUEDAD.dias(3),
    ]
    for (const texto of textos) expect(texto).not.toMatch(/\bhoy\b|probabilidad|diagn[oó]stic/i)
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
