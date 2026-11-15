import type { SupabaseClient } from "@supabase/supabase-js"

import type { ZonaVista } from "./types"

// Zonas del catálogo que sí tienen semáforo (activo = true), por nombre.
// Se lee con la sesión del usuario (RLS permite leer zonas_clima a cualquier usuario con sesión).
// `null` = no se pudo leer (la página lo muestra como error de lectura).
export async function leerZonasActivas(supabase: SupabaseClient): Promise<ZonaVista[] | null> {
  const { data, error } = await supabase
    .from("zonas_clima")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true })
  if (error || !data) return null
  return (data as ZonaVista[]).map(({ id, nombre }) => ({ id, nombre }))
}
