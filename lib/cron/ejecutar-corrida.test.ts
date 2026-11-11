import { describe, expect, it, vi } from "vitest"

import type { HoraClima } from "@/lib/risk/types"
import type { ZonaClima } from "@/lib/weather/types"

import type { AlmacenCron, CierreCorrida, ClimaGuardado, RiesgoGuardado } from "./ejecutar-corrida"
import { ejecutarCorridaRiesgo } from "./ejecutar-corrida"

// 11:00 UTC = 06:00 en Lima, día 2026-11-11.
const AHORA = new Date("2026-11-11T11:00:00Z")

const dosDias = (temperatura: number | null, humedad: number | null, lluvia: number | null): HoraClima[] =>
  ["2026-11-10", "2026-11-11"].flatMap((dia) =>
    Array.from({ length: 24 }, (_, h) => ({
      tiempo: `${dia}T${String(h).padStart(2, "0")}:00`,
      temperatura,
      humedad,
      lluvia,
    })),
  )

const CLIMA_FAVORABLE = dosDias(23, 95, 0) // 12 h seguidas o más → muy_favorable
const CLIMA_FRIO = dosDias(15, 80, 0) // poco_favorable
const CLIMA_VACIO = dosDias(null, null, null) // faltan datos → nivel null

interface FilaCorrida {
  id: string
  inicio: string
  estado: string
  detalle?: unknown
}

// Almacén en memoria que imita las tablas: así se ve qué se escribió y qué no.
function crearAlmacenFalso(
  zonas: ZonaClima[],
  opciones: {
    corridas?: FilaCorrida[]
    inicioActual?: string
    fallaCrearCorrida?: boolean
    fallaGuardarClima?: (latitud: number) => boolean
    fallaCierreInterrumpidas?: boolean
  } = {},
) {
  const corridas: FilaCorrida[] = [...(opciones.corridas ?? [])]
  const clima = new Map<string, ClimaGuardado>()
  const riesgo = new Map<string, RiesgoGuardado>()
  const cierres: Array<{ id: string; cierre: CierreCorrida }> = []
  const llamadasInterrumpidas: Array<{ idActual: string; antesDe: string }> = []

  const almacen: AlmacenCron = {
    async leerZonasActivas() {
      return zonas
    },
    async crearCorrida(inicio) {
      if (opciones.fallaCrearCorrida) throw new Error("relation cron_runs does not exist")
      const id = `run-${corridas.length + 1}`
      corridas.push({ id, inicio: opciones.inicioActual ?? inicio, estado: "en_curso" })
      return id
    },
    async cerrarCorridasInterrumpidas(idActual, antesDe) {
      llamadasInterrumpidas.push({ idActual, antesDe })
      if (opciones.fallaCierreInterrumpidas) throw new Error("no se pudo actualizar")
      let cerradas = 0
      for (const fila of corridas) {
        if (fila.estado === "en_curso" && fila.inicio < antesDe && fila.id !== idActual) {
          fila.estado = "error"
          fila.detalle = { motivo: "interrumpida" }
          cerradas += 1
        }
      }
      return cerradas
    },
    async guardarClima(c) {
      if (opciones.fallaGuardarClima?.(c.latitud)) throw new Error("fallo al guardar clima")
      clima.set(`${c.latitud}|${c.longitud}|${c.fecha}`, c)
    },
    async guardarRiesgo(r) {
      riesgo.set(`${r.zonaClimaId}|${r.fecha}`, r)
    },
    async cerrarCorrida(id, cierre) {
      cierres.push({ id, cierre })
      const fila = corridas.find((f) => f.id === id)
      if (fila) fila.estado = cierre.estado
    },
  }
  return { almacen, corridas, clima, riesgo, cierres, llamadasInterrumpidas }
}

const zona = (id: string, latitud: number, longitud = -76.77): ZonaClima => ({ id, latitud, longitud, activo: true })

describe("ejecutarCorridaRiesgo", () => {
  it("dos puntos con datos: guarda clima y riesgo y cierra en ok", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9), zona("b", -6.9), zona("c", -12.0)])
    const descargar = vi.fn(async () => CLIMA_FAVORABLE)

    const resultado = await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: descargar })

    expect(descargar).toHaveBeenCalledTimes(2) // a y b comparten punto
    expect(f.clima.size).toBe(2)
    expect(f.riesgo.size).toBe(3)
    expect(f.riesgo.get("a|2026-11-11")?.nivel).toBe("muy_favorable")
    expect([...f.clima.values()][0].fuente).toBe("open-meteo")
    expect(resultado).toMatchObject({ fecha: "2026-11-11", estado: "ok", zonasOk: 3, zonasConError: 0 })
    expect(f.cierres[0].cierre.estado).toBe("ok")
  })

  it("si un punto falla, los otros siguen y el estado es parcial sin escribir nada del fallido", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9), zona("b", -12.0)])
    const descargar = vi.fn(async (latitud: number) => {
      if (latitud === -12) throw new Error("Open-Meteo respondió 500.")
      return CLIMA_FAVORABLE
    })

    const resultado = await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: descargar })

    expect(resultado).toMatchObject({ estado: "parcial", zonasOk: 1, zonasConError: 1 })
    expect(f.riesgo.has("b|2026-11-11")).toBe(false)
    expect(f.clima.size).toBe(1)
    expect(JSON.stringify(f.cierres[0].cierre.detalle)).toContain("Open-Meteo respondió 500")
  })

  it("si todos fallan, el estado es error", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)])
    const resultado = await ejecutarCorridaRiesgo({
      ahora: AHORA,
      almacen: f.almacen,
      descargarClima: async () => {
        throw new Error("sin red")
      },
    })
    expect(resultado).toMatchObject({ estado: "error", zonasOk: 0, zonasConError: 1 })
    expect(f.riesgo.size).toBe(0)
  })

  it("nivel null: guarda el clima, no escribe riesgo y cuenta la zona con error", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)])
    const resultado = await ejecutarCorridaRiesgo({
      ahora: AHORA,
      almacen: f.almacen,
      descargarClima: async () => CLIMA_VACIO,
    })
    expect(f.clima.size).toBe(1)
    expect(f.riesgo.size).toBe(0)
    expect(resultado).toMatchObject({ estado: "error", zonasOk: 0, zonasConError: 1 })
    expect(JSON.stringify(f.cierres[0].cierre.detalle)).toContain("sin_datos")
  })

  it("si falla guardar el clima, no calcula ni escribe riesgo de ese punto", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)], { fallaGuardarClima: () => true })
    const resultado = await ejecutarCorridaRiesgo({
      ahora: AHORA,
      almacen: f.almacen,
      descargarClima: async () => CLIMA_FRIO,
    })
    expect(f.riesgo.size).toBe(0)
    expect(resultado.estado).toBe("error")
  })

  it("repetir el mismo día no duplica clima ni riesgo; solo suma una fila en cron_runs", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)])
    const dependencias = { ahora: AHORA, almacen: f.almacen, descargarClima: async () => CLIMA_FRIO }
    await ejecutarCorridaRiesgo(dependencias)
    await ejecutarCorridaRiesgo(dependencias)
    expect(f.clima.size).toBe(1)
    expect(f.riesgo.size).toBe(1)
    expect(f.corridas).toHaveLength(2)
  })

  it("si no se puede crear la fila de cron_runs, no descarga ni escribe nada", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)], { fallaCrearCorrida: true })
    const descargar = vi.fn(async () => CLIMA_FRIO)
    await expect(
      ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: descargar }),
    ).rejects.toThrow()
    expect(descargar).not.toHaveBeenCalled()
    expect(f.clima.size + f.riesgo.size).toBe(0)
  })

  it("usa la fecha de Lima, no la de UTC", async () => {
    const f = crearAlmacenFalso([zona("a", -6.9)])
    // 03:00 UTC del 11 = 22:00 del 10 en Lima
    const resultado = await ejecutarCorridaRiesgo({
      ahora: new Date("2026-11-11T03:00:00Z"),
      almacen: f.almacen,
      descargarClima: async () => CLIMA_FRIO,
    })
    expect(resultado.fecha).toBe("2026-11-10")
  })

  describe("corridas interrumpidas", () => {
    it("cierra como error una fila en_curso de hace más de 10 minutos", async () => {
      const f = crearAlmacenFalso([zona("a", -6.9)], {
        corridas: [{ id: "vieja", inicio: "2026-11-11T10:30:00Z", estado: "en_curso" }],
      })
      await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: async () => CLIMA_FRIO })
      const vieja = f.corridas.find((fila) => fila.id === "vieja")
      expect(vieja?.estado).toBe("error")
      expect(vieja?.detalle).toEqual({ motivo: "interrumpida" })
      expect(f.cierres[0].cierre.detalle).toMatchObject({ corridas_interrumpidas_cerradas: 1 })
    })

    it("no toca una fila en_curso de hace 1 minuto", async () => {
      const f = crearAlmacenFalso([zona("a", -6.9)], {
        corridas: [{ id: "reciente", inicio: "2026-11-11T10:59:00Z", estado: "en_curso" }],
      })
      await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: async () => CLIMA_FRIO })
      expect(f.corridas.find((fila) => fila.id === "reciente")?.estado).toBe("en_curso")
    })

    it("la corrida actual nunca se cierra a sí misma", async () => {
      // La fila actual nace con un inicio viejo a propósito: solo el id la salva.
      const f = crearAlmacenFalso([zona("a", -6.9)], { inicioActual: "2026-11-11T08:00:00Z" })
      await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: async () => CLIMA_FRIO })
      expect(f.llamadasInterrumpidas[0].idActual).toBe("run-1")
      expect(f.cierres).toHaveLength(1)
      expect(f.cierres[0].cierre.estado).toBe("ok") // la cerró ella, al terminar, no como interrumpida
      expect(f.corridas[0].detalle).toBeUndefined()
    })

    it("usa 10 minutos de umbral", async () => {
      const f = crearAlmacenFalso([zona("a", -6.9)])
      await ejecutarCorridaRiesgo({ ahora: AHORA, almacen: f.almacen, descargarClima: async () => CLIMA_FRIO })
      expect(f.llamadasInterrumpidas[0].antesDe).toBe("2026-11-11T10:50:00.000Z")
    })

    it("si el cierre falla, se anota y la corrida sigue", async () => {
      const f = crearAlmacenFalso([zona("a", -6.9)], { fallaCierreInterrumpidas: true })
      const resultado = await ejecutarCorridaRiesgo({
        ahora: AHORA,
        almacen: f.almacen,
        descargarClima: async () => CLIMA_FRIO,
      })
      expect(resultado.estado).toBe("ok")
      expect(f.riesgo.size).toBe(1)
      expect(f.cierres[0].cierre.detalle).toHaveProperty("cierre_interrumpidas_fallo")
    })
  })
})
