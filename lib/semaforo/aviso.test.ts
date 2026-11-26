import { describe, expect, it } from "vitest"

import { claveCierreAviso, decidirAviso } from "./aviso"
import { estadoSemaforo, type EstadoSemaforo, type RiesgoValido } from "./estado"
import type { LecturaSemaforo, RiesgoLeido } from "./types"

const ZONA = { id: "z1", nombre: "Saposoa" }

// Lima es UTC-5: 16:00Z = 11:00 en Lima.
const MEDIA_MANANA = new Date("2026-11-11T16:00:00Z")

const valido = (nivel: RiesgoValido["nivel"]): RiesgoValido => ({
  fecha: "2026-11-11",
  nivel,
  indice: 0.6,
  motivo: "Frase de riesgo_diario.",
  detalle: null,
})

const riesgoLeido = (fecha: string): RiesgoLeido => ({
  fecha,
  nivel: "favorable",
  indice: 0.6,
  motivo: "Frase de riesgo_diario.",
  detalle: null,
})

const lectura = (riesgo: RiesgoLeido | null): LecturaSemaforo => ({ error: false, zona: ZONA, riesgo })

describe("decidirAviso: qué muestra cada estado", () => {
  it.each<[string, EstadoSemaforo]>([
    ["cargando", { tipo: "cargando" }],
    ["error de lectura", { tipo: "error_lectura" }],
    ["zona sin dato", { tipo: "zona_sin_dato", zona: ZONA }],
    ["dato vencido (poco favorable)", { tipo: "dato_vencido", zona: ZONA, riesgo: valido("poco_favorable"), diasAtraso: 3 }],
    ["dato vencido (favorable)", { tipo: "dato_vencido", zona: ZONA, riesgo: valido("favorable"), diasAtraso: 1 }],
    ["dato vencido (muy favorable)", { tipo: "dato_vencido", zona: ZONA, riesgo: valido("muy_favorable"), diasAtraso: 2 }],
  ])("%s: no muestra nada", (_nombre, estado) => {
    expect(decidirAviso({ estado, ahora: MEDIA_MANANA })).toEqual({ tipo: "nada" })
  })

  it("sin zona elegida: invitación a elegir la zona", () => {
    expect(decidirAviso({ estado: { tipo: "sin_zona" }, ahora: MEDIA_MANANA })).toEqual({
      tipo: "invitacion",
      dia: "2026-11-11",
    })
  })

  it("poco favorable: franja discreta", () => {
    const estado: EstadoSemaforo = { tipo: "dato_de_hoy", zona: ZONA, riesgo: valido("poco_favorable"), esDeAyer: false }
    expect(decidirAviso({ estado, ahora: MEDIA_MANANA })).toEqual({
      tipo: "franja",
      dia: "2026-11-11",
      zona: "Saposoa",
      nivel: "poco_favorable",
      esDeAyer: false,
    })
  })

  it.each(["favorable", "muy_favorable"] as const)("%s: bloque completo", (nivel) => {
    const estado: EstadoSemaforo = { tipo: "dato_de_hoy", zona: ZONA, riesgo: valido(nivel), esDeAyer: false }
    expect(decidirAviso({ estado, ahora: MEDIA_MANANA })).toEqual({
      tipo: "bloque",
      dia: "2026-11-11",
      zona: "Saposoa",
      nivel,
      esDeAyer: false,
    })
  })

  it("el dato de ayer tolerado conserva la marca esDeAyer en franja y bloque", () => {
    const franja = decidirAviso({
      estado: { tipo: "dato_de_hoy", zona: ZONA, riesgo: valido("poco_favorable"), esDeAyer: true },
      ahora: MEDIA_MANANA,
    })
    const bloque = decidirAviso({
      estado: { tipo: "dato_de_hoy", zona: ZONA, riesgo: valido("muy_favorable"), esDeAyer: true },
      ahora: MEDIA_MANANA,
    })
    expect(franja).toMatchObject({ tipo: "franja", esDeAyer: true })
    expect(bloque).toMatchObject({ tipo: "bloque", esDeAyer: true })
  })
})

describe("decidirAviso con estadoSemaforo real: regla de las 12:00 de Lima", () => {
  const aviso = (ahora: Date, fecha: string) =>
    decidirAviso({ estado: estadoSemaforo({ lectura: lectura(riesgoLeido(fecha)), ahora }), ahora })

  it("dato de hoy: se muestra", () => {
    expect(aviso(MEDIA_MANANA, "2026-11-11")).toMatchObject({ tipo: "bloque", esDeAyer: false })
  })

  it("dato de ayer a las 11:59 de Lima: se muestra con la marca esDeAyer", () => {
    // 16:59Z = 11:59 en Lima.
    expect(aviso(new Date("2026-11-11T16:59:00Z"), "2026-11-10")).toMatchObject({ tipo: "bloque", esDeAyer: true })
  })

  it("dato de ayer a las 12:00 de Lima: no se muestra nada", () => {
    // 17:00Z = 12:00 en Lima.
    expect(aviso(new Date("2026-11-11T17:00:00Z"), "2026-11-10")).toEqual({ tipo: "nada" })
  })

  it("dato de hace varios días: no se muestra nada", () => {
    expect(aviso(MEDIA_MANANA, "2026-11-07")).toEqual({ tipo: "nada" })
  })
})

describe("día de Lima", () => {
  it("usa el día calendario de Lima, no el de UTC", () => {
    // 03:00Z del 12-nov = 22:00 del 11-nov en Lima.
    const ahora = new Date("2026-11-12T03:00:00Z")
    expect(decidirAviso({ estado: { tipo: "sin_zona" }, ahora })).toEqual({ tipo: "invitacion", dia: "2026-11-11" })
  })

  it("pasadas las 00:00 de Lima cambia el día", () => {
    // 05:00Z del 12-nov = 00:00 del 12-nov en Lima.
    const ahora = new Date("2026-11-12T05:00:00Z")
    expect(decidirAviso({ estado: { tipo: "sin_zona" }, ahora })).toEqual({ tipo: "invitacion", dia: "2026-11-12" })
  })
})

describe("claveCierreAviso", () => {
  it("incluye el día de Lima y es distinta cada día", () => {
    expect(claveCierreAviso("2026-11-11")).toContain("2026-11-11")
    expect(claveCierreAviso("2026-11-11")).not.toBe(claveCierreAviso("2026-11-12"))
  })

  it("no lleva zona, usuario ni nivel: solo el prefijo y el día", () => {
    expect(claveCierreAviso("2026-11-11")).toMatch(/^cg-aviso-semaforo-cerrado:\d{4}-\d{2}-\d{2}$/)
  })
})
