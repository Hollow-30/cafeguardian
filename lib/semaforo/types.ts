/** Zona del catálogo (public.zonas_clima) que el usuario eligió. */
export interface ZonaVista {
  id: string
  nombre: string
}

/** Última fila de public.riesgo_diario de la zona, tal como viene de la base. */
export interface RiesgoLeido {
  /** Día evaluado, "AAAA-MM-DD". */
  fecha: string
  nivel: string
  /** De 0 a 1. */
  indice: number
  /** Frase de lib/risk; se muestra tal cual. */
  motivo: string
  detalle: Record<string, unknown> | null
}

/** Resultado de leer la base para un usuario. `error` = no se pudo leer. */
export interface LecturaSemaforo {
  error: boolean
  zona: ZonaVista | null
  riesgo: RiesgoLeido | null
}
