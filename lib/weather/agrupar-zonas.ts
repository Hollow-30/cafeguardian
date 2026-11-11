import type { PuntoClima, ZonaClima } from "./types"

const DECIMALES = 6

// Solo las zonas activas. Las que repiten coordenadas (a 6 decimales, como en la base) quedan
// en el mismo punto, para bajar el clima una sola vez. El orden de salida no depende del de entrada.
export function agruparZonasPorPunto(zonas: readonly ZonaClima[]): PuntoClima[] {
  const puntos = new Map<string, PuntoClima>()

  for (const zona of zonas) {
    if (zona.activo !== true) continue
    const latitud = Number(Number(zona.latitud).toFixed(DECIMALES))
    const longitud = Number(Number(zona.longitud).toFixed(DECIMALES))
    const clave = `${latitud}|${longitud}`
    const punto = puntos.get(clave) ?? { latitud, longitud, zonaIds: [] }
    punto.zonaIds.push(zona.id)
    puntos.set(clave, punto)
  }

  return [...puntos.values()]
    .map((punto) => ({ ...punto, zonaIds: [...punto.zonaIds].sort() }))
    .sort((a, b) => a.latitud - b.latitud || a.longitud - b.longitud)
}
