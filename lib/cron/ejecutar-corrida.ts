import { calcularRiesgo } from "@/lib/risk/calcular-riesgo"
import type { HoraClima, NivelRiesgo } from "@/lib/risk/types"
import { agruparZonasPorPunto } from "@/lib/weather/agrupar-zonas"
import { FUENTE_CLIMA } from "@/lib/weather/open-meteo"
import type { ZonaClima } from "@/lib/weather/types"

import { fechaEnLima } from "./fecha-lima"

// Una corrida "en_curso" con más de esto se da por interrumpida (la función de Vercel murió a medias).
export const MINUTOS_CORRIDA_INTERRUMPIDA = 10

export type EstadoCorrida = "ok" | "parcial" | "error"

export interface RiesgoGuardado {
  zonaClimaId: string
  fecha: string
  nivel: NivelRiesgo
  indice: number
  motivo: string
  detalle: Record<string, unknown>
  calculadoEn: string
}

export interface ClimaGuardado {
  latitud: number
  longitud: number
  fecha: string
  horas: HoraClima[]
  fuente: string
  descargadoEn: string
}

export interface CierreCorrida {
  fin: string
  estado: EstadoCorrida
  zonasOk: number
  zonasConError: number
  detalle: Record<string, unknown>
}

// Lo único que la corrida necesita de la base. Así se prueba con uno falso, sin Supabase.
export interface AlmacenCron {
  leerZonasActivas(): Promise<ZonaClima[]>
  crearCorrida(inicio: string): Promise<string>
  cerrarCorridasInterrumpidas(idActual: string, inicioAntesDe: string, fin: string): Promise<number>
  guardarClima(clima: ClimaGuardado): Promise<void>
  guardarRiesgo(riesgo: RiesgoGuardado): Promise<void>
  cerrarCorrida(id: string, cierre: CierreCorrida): Promise<void>
}

export interface DependenciasCorrida {
  ahora: Date
  almacen: AlmacenCron
  descargarClima: (latitud: number, longitud: number) => Promise<HoraClima[]>
}

export interface ResultadoCorrida {
  runId: string
  fecha: string
  estado: EstadoCorrida
  zonasOk: number
  zonasConError: number
}

const mensajeCorto = (error: unknown) =>
  (error instanceof Error ? error.message : "Error desconocido").slice(0, 200)

export async function ejecutarCorridaRiesgo({
  ahora,
  almacen,
  descargarClima,
}: DependenciasCorrida): Promise<ResultadoCorrida> {
  const fecha = fechaEnLima(ahora)
  const puntos = agruparZonasPorPunto(await almacen.leerZonasActivas())

  // La fila de la corrida se crea ANTES de descargar: si no se puede escribir, no se hace nada más.
  const runId = await almacen.crearCorrida(ahora.toISOString())

  // Cierra corridas viejas que quedaron "en_curso". Si falla, se anota y la corrida sigue.
  const detalle: Record<string, unknown> = { fecha }
  try {
    const umbral = new Date(ahora.getTime() - MINUTOS_CORRIDA_INTERRUMPIDA * 60_000)
    const cerradas = await almacen.cerrarCorridasInterrumpidas(runId, umbral.toISOString(), ahora.toISOString())
    if (cerradas > 0) detalle.corridas_interrumpidas_cerradas = cerradas
  } catch (error) {
    detalle.cierre_interrumpidas_fallo = mensajeCorto(error)
  }

  let zonasOk = 0
  let zonasConError = 0
  const porPunto: Array<Record<string, unknown>> = []

  for (const punto of puntos) {
    const etiqueta = { latitud: punto.latitud, longitud: punto.longitud, zonas: punto.zonaIds.length }
    try {
      const horas = await descargarClima(punto.latitud, punto.longitud)
      const descargadoEn = new Date().toISOString()
      await almacen.guardarClima({
        latitud: punto.latitud,
        longitud: punto.longitud,
        fecha,
        horas,
        fuente: FUENTE_CLIMA,
        descargadoEn,
      })

      const riesgo = calcularRiesgo({ fecha, horas })
      if (riesgo.nivel === null) {
        // Sin datos suficientes: no se escribe riesgo y queda el semáforo anterior.
        zonasConError += punto.zonaIds.length
        porPunto.push({ ...etiqueta, estado: "sin_datos", motivo: riesgo.motivo })
        continue
      }

      let fallosGuardado = 0
      for (const zonaClimaId of punto.zonaIds) {
        try {
          await almacen.guardarRiesgo({
            zonaClimaId,
            fecha,
            nivel: riesgo.nivel,
            indice: riesgo.indice as number,
            motivo: riesgo.motivo,
            detalle: riesgo.detalle as unknown as Record<string, unknown>,
            calculadoEn: descargadoEn,
          })
          zonasOk += 1
        } catch {
          zonasConError += 1
          fallosGuardado += 1
        }
      }
      porPunto.push(
        fallosGuardado === 0
          ? { ...etiqueta, estado: "ok" }
          : { ...etiqueta, estado: "error", mensaje: `No se pudo guardar el riesgo de ${fallosGuardado} zona(s).` },
      )
    } catch (error) {
      zonasConError += punto.zonaIds.length
      porPunto.push({ ...etiqueta, estado: "error", mensaje: mensajeCorto(error) })
    }
  }

  detalle.puntos = porPunto
  if (puntos.length === 0) detalle.aviso = "sin_zonas_activas"

  const estado: EstadoCorrida = zonasOk === 0 ? "error" : zonasConError > 0 ? "parcial" : "ok"
  await almacen.cerrarCorrida(runId, {
    fin: new Date().toISOString(),
    estado,
    zonasOk,
    zonasConError,
    detalle,
  })

  return { runId, fecha, estado, zonasOk, zonasConError }
}
