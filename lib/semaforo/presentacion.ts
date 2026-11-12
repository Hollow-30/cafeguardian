import type { NivelRiesgo } from "@/lib/risk/types"

import type { RiesgoValido } from "./estado"

// Único lugar con etiquetas, textos y colores del semáforo. Todos los textos de "qué hacer"
// son supuestos a validar con SENASA/INIA o un técnico. El índice mide qué tan favorable es el
// clima para la infección: no se habla de probabilidad de roya ni de diagnóstico.

export type ColorSemaforo = "verde" | "amarillo" | "rojo"
export type IconoSemaforo = "check" | "alerta" | "peligro"

export interface PresentacionNivel {
  etiqueta: string
  color: ColorSemaforo
  /** Nombre del icono; cada nivel tiene uno distinto para no depender solo del color. */
  icono: IconoSemaforo
  queHacer: string
  /** Colores en hexadecimal (contraste verificado en las pruebas). */
  colores: { fondo: string; borde: string; texto: string; barra: string }
}

export const NIVELES_PRESENTACION: Record<NivelRiesgo, PresentacionNivel> = {
  poco_favorable: {
    etiqueta: "Poco favorable",
    color: "verde",
    icono: "check",
    queHacer: "Revisa tus hojas con tu rutina de siempre.",
    colores: { fondo: "#ecfdf5", borde: "#047857", texto: "#064e3b", barra: "#047857" },
  },
  favorable: {
    etiqueta: "Favorable",
    color: "amarillo",
    icono: "alerta",
    queHacer: "Revisa tus hojas esta semana.",
    colores: { fondo: "#fef3c7", borde: "#b45309", texto: "#451a03", barra: "#b45309" },
  },
  muy_favorable: {
    etiqueta: "Muy favorable",
    color: "rojo",
    icono: "peligro",
    queHacer:
      "Revisa tus hojas pronto. Si ves manchas amarillas o polvo anaranjado en el envés, consulta a un técnico.",
    colores: { fondo: "#fee2e2", borde: "#b91c1c", texto: "#7f1d1d", barra: "#b91c1c" },
  },
}

export const TEXTOS_SEMAFORO = {
  titulo: "Semáforo de roya de tu zona",
  cargando: "Cargando el semáforo de tu zona…",
  sinZona: "Aún no elegiste tu zona.",
  errorLectura: "No pudimos cargar el semáforo. Vuelve a intentar en unos minutos.",
  notaDatoDeAyer: "El de hoy se calcula alrededor de las 6 a. m.",
  sinDato: (zona: string) => `Todavía no hay estimación para la zona ${zona}.`,
  estimacion: (zona: string) =>
    `Estimación para la zona ${zona} (unos 9 km a la redonda). No es una medición de tu parcela.`,
  datoDelDia: (fechaTexto: string) => `Estimación del ${fechaTexto}`,
  datoVencido: (fechaTexto: string) => `Dato del ${fechaTexto}`,
} as const

export const CREDITO_CLIMA = {
  texto: "Weather data by Open-Meteo.com",
  url: "https://open-meteo.com/",
  licencia: "CC BY 4.0",
  urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
} as const

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

// "2026-11-11" -> "11 de noviembre". Sin Date ni zona horaria, así no hay desfase de un día.
export function formatearFecha(fecha: string): string {
  const [, mes, dia] = fecha.split("-").map(Number)
  return `${dia} de ${MESES[mes - 1]}`
}

const numeroODefault = (valor: unknown) => (typeof valor === "number" && Number.isFinite(valor) ? valor : null)

export interface VistaRiesgo {
  presentacion: PresentacionNivel
  /** Entre 0 y 1, para la barra de progreso. */
  indice: number
  /** Entero de 0 a 100. */
  indicePorcentaje: number
  /** Tal cual viene de riesgo_diario. */
  motivo: string
  fecha: string
  fechaTexto: string
  /** Del detalle de lib/risk; `null` si la fila no lo trae. No hay temperatura ni humedad. */
  rachaMaxima: number | null
  horasHojaHumeda: number | null
  lluviaDia: number | null
}

export function vistaDelRiesgo(riesgo: RiesgoValido): VistaRiesgo {
  const indice = Math.min(1, Math.max(0, Number.isFinite(riesgo.indice) ? riesgo.indice : 0))
  return {
    presentacion: NIVELES_PRESENTACION[riesgo.nivel],
    indice,
    indicePorcentaje: Math.round(indice * 100),
    motivo: riesgo.motivo,
    fecha: riesgo.fecha,
    fechaTexto: formatearFecha(riesgo.fecha),
    rachaMaxima: numeroODefault(riesgo.detalle?.rachaMaxima),
    horasHojaHumeda: numeroODefault(riesgo.detalle?.horasHojaHumeda),
    lluviaDia: numeroODefault(riesgo.detalle?.lluviaDia),
  }
}
