import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { crearAlmacenSupabase } from "./almacen-supabase"

// Cliente falso: anota cada llamada encadenada y responde con lo que se le indique.
function clienteFalso(respuesta: { data?: unknown; error?: { message: string } | null } = {}) {
  const llamadas: Array<{ tabla: string; pasos: Array<[string, unknown[]]> }> = []
  const from = (tabla: string) => {
    const registro = { tabla, pasos: [] as Array<[string, unknown[]]> }
    llamadas.push(registro)
    const cadena: Record<string, unknown> = {}
    for (const metodo of ["select", "insert", "update", "upsert", "eq", "lt", "neq", "single"]) {
      cadena[metodo] = (...args: unknown[]) => {
        registro.pasos.push([metodo, args])
        return cadena
      }
    }
    cadena.then = (resolver: (valor: unknown) => unknown) =>
      Promise.resolve({ data: respuesta.data ?? null, error: respuesta.error ?? null }).then(resolver)
    return cadena
  }
  return { cliente: { from } as unknown as SupabaseClient, llamadas }
}

const paso = (llamada: { pasos: Array<[string, unknown[]]> }, metodo: string) =>
  llamada.pasos.find(([nombre]) => nombre === metodo)?.[1]

describe("crearAlmacenSupabase", () => {
  it("guarda el clima con el onConflict del punto y la fecha", async () => {
    const { cliente, llamadas } = clienteFalso()
    await crearAlmacenSupabase(cliente).guardarClima({
      latitud: -6.9,
      longitud: -76.7,
      fecha: "2026-11-11",
      horas: [],
      fuente: "open-meteo",
      descargadoEn: "2026-11-11T11:00:00Z",
    })
    expect(llamadas[0].tabla).toBe("clima_diario")
    expect(paso(llamadas[0], "upsert")?.[1]).toEqual({ onConflict: "latitud,longitud,fecha" })
  })

  it("guarda el riesgo con el onConflict de zona y fecha", async () => {
    const { cliente, llamadas } = clienteFalso()
    await crearAlmacenSupabase(cliente).guardarRiesgo({
      zonaClimaId: "z1",
      fecha: "2026-11-11",
      nivel: "favorable",
      indice: 0.5,
      motivo: "m",
      detalle: {},
      calculadoEn: "2026-11-11T11:00:00Z",
    })
    expect(llamadas[0].tabla).toBe("riesgo_diario")
    expect(paso(llamadas[0], "upsert")?.[1]).toEqual({ onConflict: "zona_clima_id,fecha" })
  })

  it("cierra interrumpidas solo en_curso, más viejas que el umbral y distintas de la actual", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [{ id: "a" }, { id: "b" }] })
    const cerradas = await crearAlmacenSupabase(cliente).cerrarCorridasInterrumpidas(
      "actual",
      "2026-11-11T10:50:00Z",
      "2026-11-11T11:00:00Z",
    )
    expect(cerradas).toBe(2)
    expect(paso(llamadas[0], "eq")).toEqual(["estado", "en_curso"])
    expect(paso(llamadas[0], "lt")).toEqual(["inicio", "2026-11-11T10:50:00Z"])
    expect(paso(llamadas[0], "neq")).toEqual(["id", "actual"])
  })

  it("devuelve el id de la corrida creada", async () => {
    const { cliente } = clienteFalso({ data: { id: "run-1" } })
    expect(await crearAlmacenSupabase(cliente).crearCorrida("2026-11-11T11:00:00Z")).toBe("run-1")
  })

  it("lanza si Supabase devuelve error", async () => {
    const { cliente } = clienteFalso({ error: { message: "relation does not exist" } })
    const almacen = crearAlmacenSupabase(cliente)
    await expect(almacen.crearCorrida("x")).rejects.toThrow(/does not exist/)
    await expect(almacen.leerZonasActivas()).rejects.toThrow()
    await expect(
      almacen.cerrarCorrida("id", { fin: "x", estado: "ok", zonasOk: 1, zonasConError: 0, detalle: {} }),
    ).rejects.toThrow()
  })
})
