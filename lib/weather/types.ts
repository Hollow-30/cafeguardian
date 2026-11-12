/** Fila de public.zonas_clima con lo que necesita la descarga. */
export interface ZonaClima {
  id: string
  latitud: number | string
  longitud: number | string
  activo: boolean
}

/** Un punto de coordenadas y las zonas que lo comparten: el clima se baja una vez por punto. */
export interface PuntoClima {
  latitud: number
  longitud: number
  zonaIds: string[]
}
