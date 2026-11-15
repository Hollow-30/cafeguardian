import type { SupabaseClient } from "@supabase/supabase-js"

import type { LecturaSemaforo } from "./types"

const FALLO: LecturaSemaforo = { error: true, zona: null, riesgo: null }

// Lee con el cliente de la sesión del usuario (RLS), nunca con service role:
// el perfil propio, la zona del catálogo y la última fila de riesgo_diario de esa zona.
// Si la migración de profiles.zona_clima_id no está aplicada, la primera lectura falla y devuelve error.
export async function leerSemaforo(supabase: SupabaseClient, userId: string): Promise<LecturaSemaforo> {
  const { data: perfil, error: errorPerfil } = await supabase
    .from("profiles")
    .select("zona_clima_id")
    .eq("id", userId)
    .maybeSingle()
  if (errorPerfil) return FALLO

  const zonaId = (perfil as { zona_clima_id?: string | null } | null)?.zona_clima_id
  if (!zonaId) return { error: false, zona: null, riesgo: null }

  const { data: zona, error: errorZona } = await supabase
    .from("zonas_clima")
    .select("id, nombre")
    .eq("id", zonaId)
    .maybeSingle()
  if (errorZona) return FALLO
  if (!zona) return { error: false, zona: null, riesgo: null }
  const zonaVista = zona as { id: string; nombre: string }

  const { data: fila, error: errorRiesgo } = await supabase
    .from("riesgo_diario")
    .select("fecha, nivel, indice, motivo, detalle")
    .eq("zona_clima_id", zonaId)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errorRiesgo) return FALLO

  if (!fila) return { error: false, zona: zonaVista, riesgo: null }
  const riesgo = fila as {
    fecha: string
    nivel: string
    indice: number | string
    motivo: string
    detalle: Record<string, unknown> | null
  }
  return {
    error: false,
    zona: zonaVista,
    riesgo: {
      fecha: riesgo.fecha,
      nivel: riesgo.nivel,
      indice: Number(riesgo.indice),
      motivo: riesgo.motivo,
      detalle: riesgo.detalle,
    },
  }
}
