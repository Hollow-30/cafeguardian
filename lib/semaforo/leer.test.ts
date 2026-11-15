import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { leerSemaforo } from "./leer"

type Respuesta = { data: unknown; error: { message: string } | null }

// Cliente falso: una respuesta por tabla y registro de los pasos encadenados.
function clienteFalso(respuestas: Record<string, Respuesta>) {
  const pasos: Array<{ tabla: string; metodo: string; args: unknown[] }> = []
  const from = (tabla: string) => {
    const cadena: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "order", "limit"]) {
      cadena[metodo] = (...args: unknown[]) => {
        pasos.push({ tabla, metodo, args })
        return cadena
      }
    }
    cadena.maybeSingle = async () => respuestas[tabla] ?? { data: null, error: null }
    return cadena
  }
  return { cliente: { from } as unknown as SupabaseClient, pasos }
}

const ok = (data: unknown): Respuesta => ({ data, error: null })
const fallo: Respuesta = { data: null, error: { message: "boom" } }

describe("leerSemaforo", () => {
  it("devuelve zona y última fila de riesgo", async () => {
    const { cliente } = clienteFalso({
      profiles: ok({ zona_clima_id: "z1" }),
      zonas_clima: ok({ id: "z1", nombre: "Saposoa" }),
      riesgo_diario: ok({
        fecha: "2026-11-11",
        nivel: "favorable",
        indice: "0.62",
        motivo: "m",
        detalle: { rachaMaxima: 7 },
      }),
    })
    expect(await leerSemaforo(cliente, "u1")).toEqual({
      error: false,
      zona: { id: "z1", nombre: "Saposoa" },
      riesgo: { fecha: "2026-11-11", nivel: "favorable", indice: 0.62, motivo: "m", detalle: { rachaMaxima: 7 } },
    })
  })

  it("consulta el perfil propio y la última fila por fecha descendente", async () => {
    const { cliente, pasos } = clienteFalso({
      profiles: ok({ zona_clima_id: "z1" }),
      zonas_clima: ok({ id: "z1", nombre: "Saposoa" }),
      riesgo_diario: ok(null),
    })
    await leerSemaforo(cliente, "u1")
    expect(pasos).toContainEqual({ tabla: "profiles", metodo: "eq", args: ["id", "u1"] })
    expect(pasos).toContainEqual({ tabla: "riesgo_diario", metodo: "eq", args: ["zona_clima_id", "z1"] })
    expect(pasos).toContainEqual({ tabla: "riesgo_diario", metodo: "order", args: ["fecha", { ascending: false }] })
    expect(pasos).toContainEqual({ tabla: "riesgo_diario", metodo: "limit", args: [1] })
  })

  it("sin zona elegida no consulta más tablas", async () => {
    const { cliente, pasos } = clienteFalso({ profiles: ok({ zona_clima_id: null }) })
    expect(await leerSemaforo(cliente, "u1")).toEqual({ error: false, zona: null, riesgo: null })
    expect(pasos.every((paso) => paso.tabla === "profiles")).toBe(true)
  })

  it("zona sin filas de riesgo: zona sin riesgo", async () => {
    const { cliente } = clienteFalso({
      profiles: ok({ zona_clima_id: "z1" }),
      zonas_clima: ok({ id: "z1", nombre: "Saposoa" }),
      riesgo_diario: ok(null),
    })
    expect(await leerSemaforo(cliente, "u1")).toEqual({
      error: false,
      zona: { id: "z1", nombre: "Saposoa" },
      riesgo: null,
    })
  })

  it("un error de cualquier lectura devuelve error (p. ej. migración sin aplicar)", async () => {
    for (const tabla of ["profiles", "zonas_clima", "riesgo_diario"]) {
      const { cliente } = clienteFalso({
        profiles: ok({ zona_clima_id: "z1" }),
        zonas_clima: ok({ id: "z1", nombre: "Saposoa" }),
        riesgo_diario: ok(null),
        [tabla]: fallo,
      })
      expect(await leerSemaforo(cliente, "u1")).toEqual({ error: true, zona: null, riesgo: null })
    }
  })
})
