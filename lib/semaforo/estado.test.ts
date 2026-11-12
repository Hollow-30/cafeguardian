import { describe, expect, it } from "vitest"

import { HORA_LIMITE_DATO_DE_AYER, estadoSemaforo } from "./estado"
import type { LecturaSemaforo, RiesgoLeido } from "./types"

const ZONA = { id: "z1", nombre: "Saposoa" }

const riesgo = (fecha: string, nivel = "favorable"): RiesgoLeido => ({
  fecha,
  nivel,
  indice: 0.6,
  motivo: "El clima ayuda a que la roya avance.",
  detalle: { rachaMaxima: 7 },
})

const lectura = (parcial: Partial<LecturaSemaforo>): LecturaSemaforo => ({
  error: false,
  zona: ZONA,
  riesgo: null,
  ...parcial,
})

// Lima es UTC-5: 16:00Z = 11:00 en Lima.
const MEDIA_MANANA = new Date("2026-11-11T16:00:00Z")

describe("estadoSemaforo", () => {
  it("sin lectura todavía: cargando", () => {
    expect(estadoSemaforo({ lectura: null, ahora: MEDIA_MANANA })).toEqual({ tipo: "cargando" })
  })

  it("error de lectura", () => {
    expect(estadoSemaforo({ lectura: lectura({ error: true, zona: null }), ahora: MEDIA_MANANA })).toEqual({
      tipo: "error_lectura",
    })
  })

  it("sin zona elegida", () => {
    expect(estadoSemaforo({ lectura: lectura({ zona: null }), ahora: MEDIA_MANANA })).toEqual({ tipo: "sin_zona" })
  })

  it("zona sin ninguna fila de riesgo: zona sin dato", () => {
    expect(estadoSemaforo({ lectura: lectura({ riesgo: null }), ahora: MEDIA_MANANA })).toEqual({
      tipo: "zona_sin_dato",
      zona: ZONA,
    })
  })

  it("una fila con nivel o fecha que no se entiende cuenta como sin dato", () => {
    expect(estadoSemaforo({ lectura: lectura({ riesgo: riesgo("2026-11-11", "amarillo") }), ahora: MEDIA_MANANA }).tipo).toBe(
      "zona_sin_dato",
    )
    expect(estadoSemaforo({ lectura: lectura({ riesgo: riesgo("11/11/2026") }), ahora: MEDIA_MANANA }).tipo).toBe(
      "zona_sin_dato",
    )
  })

  it("dato de hoy en Lima", () => {
    const estado = estadoSemaforo({ lectura: lectura({ riesgo: riesgo("2026-11-11") }), ahora: MEDIA_MANANA })
    expect(estado).toMatchObject({ tipo: "dato_de_hoy", esDeAyer: false, zona: ZONA })
  })

  it("una fecha futura cuenta como de hoy", () => {
    const estado = estadoSemaforo({ lectura: lectura({ riesgo: riesgo("2026-11-12") }), ahora: MEDIA_MANANA })
    expect(estado).toMatchObject({ tipo: "dato_de_hoy", esDeAyer: false })
  })

  it("'hoy' sigue la fecha de Lima: 04:59Z todavía es el día anterior", () => {
    const estado = estadoSemaforo({
      lectura: lectura({ riesgo: riesgo("2026-11-10") }),
      ahora: new Date("2026-11-11T04:59:00Z"),
    })
    expect(estado).toMatchObject({ tipo: "dato_de_hoy", esDeAyer: false })
  })

  describe("dato de ayer", () => {
    const ayer = lectura({ riesgo: riesgo("2026-11-10") })

    it("a las 00:00 de Lima se tolera como vigente, con la marca esDeAyer", () => {
      const estado = estadoSemaforo({ lectura: ayer, ahora: new Date("2026-11-11T05:00:00Z") })
      expect(estado).toMatchObject({ tipo: "dato_de_hoy", esDeAyer: true })
    })

    it("a las 11:59 de Lima se tolera todavía", () => {
      const estado = estadoSemaforo({ lectura: ayer, ahora: new Date("2026-11-11T16:59:00Z") })
      expect(estado).toMatchObject({ tipo: "dato_de_hoy", esDeAyer: true })
    })

    it("desde las 12:00 de Lima ya es vencido", () => {
      const estado = estadoSemaforo({ lectura: ayer, ahora: new Date("2026-11-11T17:00:00Z") })
      expect(estado).toMatchObject({ tipo: "dato_vencido", diasAtraso: 1 })
    })

    it("la hora límite es 12", () => {
      expect(HORA_LIMITE_DATO_DE_AYER).toBe(12)
    })
  })

  it("con más de un día de atraso es vencido aunque sea de mañana", () => {
    const estado = estadoSemaforo({
      lectura: lectura({ riesgo: riesgo("2026-11-08") }),
      ahora: new Date("2026-11-11T11:00:00Z"),
    })
    expect(estado).toMatchObject({ tipo: "dato_vencido", diasAtraso: 3 })
  })

  it("el estado de dato conserva el nivel válido y el motivo", () => {
    const estado = estadoSemaforo({ lectura: lectura({ riesgo: riesgo("2026-11-11", "muy_favorable") }), ahora: MEDIA_MANANA })
    if (estado.tipo !== "dato_de_hoy") throw new Error("se esperaba dato de hoy")
    expect(estado.riesgo.nivel).toBe("muy_favorable")
    expect(estado.riesgo.motivo).toBe("El clima ayuda a que la roya avance.")
  })
})
