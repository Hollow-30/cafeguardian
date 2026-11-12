import { fechaEnLima } from "@/lib/cron/fecha-lima"
import type { NivelRiesgo } from "@/lib/risk/types"

import type { LecturaSemaforo, RiesgoLeido, ZonaVista } from "./types"

// Supuesto a validar: hasta las 12:00 de Lima se acepta el dato de ayer como vigente,
// porque el cron de las 06:00 (±59 min) puede tardar o fallar esa mañana.
export const HORA_LIMITE_DATO_DE_AYER = 12

const NIVELES: readonly NivelRiesgo[] = ["poco_favorable", "favorable", "muy_favorable"]
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

const formatoHora = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Lima",
  hour: "2-digit",
  hourCycle: "h23",
})

export type RiesgoValido = Omit<RiesgoLeido, "nivel"> & { nivel: NivelRiesgo }

export type EstadoSemaforo =
  | { tipo: "cargando" }
  | { tipo: "error_lectura" }
  | { tipo: "sin_zona" }
  | { tipo: "zona_sin_dato"; zona: ZonaVista }
  | { tipo: "dato_de_hoy"; zona: ZonaVista; riesgo: RiesgoValido; esDeAyer: boolean }
  | { tipo: "dato_vencido"; zona: ZonaVista; riesgo: RiesgoValido; diasAtraso: number }

const esNivel = (valor: string): valor is NivelRiesgo => (NIVELES as readonly string[]).includes(valor)

const aDiaUtc = (fecha: string) => {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

const diasEntre = (desde: string, hasta: string) => Math.round((aDiaUtc(hasta) - aDiaUtc(desde)) / 86_400_000)

// Pura: recibe la lectura ya hecha y la hora actual. `lectura: null` significa "todavía cargando".
export function estadoSemaforo({ lectura, ahora }: { lectura: LecturaSemaforo | null; ahora: Date }): EstadoSemaforo {
  if (!lectura) return { tipo: "cargando" }
  if (lectura.error) return { tipo: "error_lectura" }
  if (!lectura.zona) return { tipo: "sin_zona" }

  const { zona, riesgo } = lectura
  // Una fila con fecha o nivel que no se entiende se trata como "sin dato", no como dato válido.
  if (!riesgo || !FORMATO_FECHA.test(riesgo.fecha) || !esNivel(riesgo.nivel)) {
    return { tipo: "zona_sin_dato", zona }
  }
  const valido: RiesgoValido = { ...riesgo, nivel: riesgo.nivel }

  const hoy = fechaEnLima(ahora)
  // Una fecha futura (reloj desfasado) cuenta como de hoy.
  if (riesgo.fecha >= hoy) return { tipo: "dato_de_hoy", zona, riesgo: valido, esDeAyer: false }

  const atraso = diasEntre(riesgo.fecha, hoy)
  const horaLima = Number(formatoHora.format(ahora))
  if (atraso === 1 && horaLima < HORA_LIMITE_DATO_DE_AYER) {
    return { tipo: "dato_de_hoy", zona, riesgo: valido, esDeAyer: true }
  }
  return { tipo: "dato_vencido", zona, riesgo: valido, diasAtraso: atraso }
}
