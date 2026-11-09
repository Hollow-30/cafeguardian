export type NivelRiesgo = "poco_favorable" | "favorable" | "muy_favorable"

/** Una hora de clima de una zona. `null` significa que la fuente no entregó ese dato. */
export interface HoraClima {
  /** Hora local de la zona, sin zona horaria: "2026-11-07T14:00". */
  tiempo: string
  /** Temperatura del aire, en °C. */
  temperatura: number | null
  /** Humedad relativa, en %. */
  humedad: number | null
  /** Lluvia caída en esa hora, en mm. */
  lluvia: number | null
}

export interface EntradaRiesgo {
  /** Día a evaluar: "2026-11-07". Puede ser un día ya pasado o un pronóstico. */
  fecha: string
  /**
   * Clima por hora de la zona. Debe incluir el día anterior, porque una racha de horas
   * favorables puede cruzar la medianoche. Las horas de otros días se ignoran.
   */
  horas: readonly HoraClima[]
}

/** Todos son "supuesto a validar": ver params.ts. */
export interface ParametrosRiesgo {
  temperaturaMin: number
  temperaturaMax: number
  humedadMin: number
  lluviaDiariaMax: number
  aplicarReglaLluvia: boolean
  horasParaIndiceMaximo: number
  corteFavorable: number
  corteMuyFavorable: number
  horasMinimasConDato: number
}

export interface DetalleRiesgo {
  fecha: string
  /** Horas del día evaluado con temperatura, humedad y lluvia completas (de 0 a 24). */
  horasConDato: number
  /** Horas del día evaluado que faltan o vienen incompletas. */
  horasSinDato: number
  /** Horas con temperatura dentro del rango. */
  horasTemperatura: number
  /** Horas con hoja húmeda estimada (humedad alta o lluvia). No es una medición. */
  horasHojaHumeda: number
  /** Mayor racha de horas favorables seguidas que termina en una hora del día evaluado. */
  rachaMaxima: number
  /** Lluvia total del día, en mm, con un decimal. */
  lluviaDia: number
  /** `true` si la lluvia del día dejó el índice en 0. */
  reglaLluviaAplicada: boolean
  /** Copia de los parámetros con los que se calculó. */
  parametros: ParametrosRiesgo
}

export interface ResultadoRiesgo {
  /** `null` si faltan datos para calcular. */
  nivel: NivelRiesgo | null
  /** De 0 (nada favorable para la infección) a 1 (lo máximo), con dos decimales. `null` si faltan datos. */
  indice: number | null
  /** Una sola frase en español sencillo para el caficultor. */
  motivo: string
  detalle: DetalleRiesgo
}
