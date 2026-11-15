import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { leerZonasActivas } from "./zonas"

type Respuesta = { data: unknown; error: { message: string } | null }

// Cliente falso: la cadena se puede esperar (await) y registra los pasos encadenados.
function clienteFalso(respuesta: Respuesta) {
  const pasos: Array<{ tabla: string; metodo: string; args: unknown[] }> = []
  let tabla = ""
  const cadena: Record<string, unknown> = {}
  for (const metodo of ["select", "eq", "order"]) {
    cadena[metodo] = (...args: unknown[]) => {
      pasos.push({ tabla, metodo, args })
      return cadena
    }
  }
  cadena.then = (resolver: (valor: Respuesta) => unknown) => Promise.resolve(respuesta).then(resolver)
  const from = (nombre: string) => {
    tabla = nombre
    return cadena
  }
  return { cliente: { from } as unknown as SupabaseClient, pasos }
}

describe("leerZonasActivas", () => {
  it("pide solo las zonas activas, ordenadas por nombre", async () => {
    const { cliente, pasos } = clienteFalso({
      data: [{ id: "z1", nombre: "Alto Saposoa", activo: true }],
      error: null,
    })
    expect(await leerZonasActivas(cliente)).toEqual([{ id: "z1", nombre: "Alto Saposoa" }])
    expect(pasos).toContainEqual({ tabla: "zonas_clima", metodo: "eq", args: ["activo", true] })
    expect(pasos).toContainEqual({ tabla: "zonas_clima", metodo: "order", args: ["nombre", { ascending: true }] })
  })

  it("sin zonas devuelve una lista vacía, no un error", async () => {
    const { cliente } = clienteFalso({ data: [], error: null })
    expect(await leerZonasActivas(cliente)).toEqual([])
  })

  it("devuelve null si la lectura falla", async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: "boom" } })
    expect(await leerZonasActivas(cliente)).toBeNull()
  })
})
