import { fechaEnLima } from "@/lib/cron/fecha-lima"
import type { NivelRiesgo } from "@/lib/risk/types"

import type { EstadoSemaforo } from "./estado"

// Qué aviso del semáforo se muestra en el inicio del caficultor. Función pura y sin textos:
// los textos y colores salen de presentacion.ts. Todo el resultado es serializable, porque el
// servidor lo manda al componente cliente.
//
// No repite la regla de las 12:00 de Lima: estadoSemaforo ya la aplica (HORA_LIMITE_DATO_DE_AYER)
// y marca el dato de ayer con `esDeAyer`. Un dato vencido, sin dato o un error no muestran nada.

export type AvisoDecision =
  | { tipo: "nada" }
  | { tipo: "invitacion"; dia: string }
  | { tipo: "franja"; dia: string; zona: string; nivel: "poco_favorable"; esDeAyer: boolean }
  | { tipo: "bloque"; dia: string; zona: string; nivel: Exclude<NivelRiesgo, "poco_favorable">; esDeAyer: boolean }

/** Lo que el componente recibe: todo menos "nada" (con "nada" no se renderiza el aviso). */
export type AvisoVisible = Exclude<AvisoDecision, { tipo: "nada" }>

export const PREFIJO_CLAVE_CIERRE = "cg-aviso-semaforo-cerrado:"

// Clave de localStorage para "cerrado el resto de este día". Solo lleva el día de Lima:
// nada de zona, usuario ni nivel.
export function claveCierreAviso(dia: string): string {
  return `${PREFIJO_CLAVE_CIERRE}${dia}`
}

export function decidirAviso({ estado, ahora }: { estado: EstadoSemaforo; ahora: Date }): AvisoDecision {
  const dia = fechaEnLima(ahora)

  if (estado.tipo === "sin_zona") return { tipo: "invitacion", dia }
  if (estado.tipo !== "dato_de_hoy") return { tipo: "nada" }

  const { nivel } = estado.riesgo
  const zona = estado.zona.nombre
  const { esDeAyer } = estado
  if (nivel === "poco_favorable") return { tipo: "franja", dia, zona, nivel, esDeAyer }
  return { tipo: "bloque", dia, zona, nivel, esDeAyer }
}
