import type { SupabaseClient } from "@supabase/supabase-js"

import type { ZonaClima } from "@/lib/weather/types"

import type { AlmacenCron } from "./ejecutar-corrida"

// Si Supabase devuelve error, se lanza: la corrida lo atrapa y lo cuenta como fallo del punto.
function revisar(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// Implementación real del almacén. Recibe el cliente con service role (createAdminClient()).
export function crearAlmacenSupabase(supabase: SupabaseClient): AlmacenCron {
  return {
    async leerZonasActivas() {
      const { data, error } = await supabase
        .from("zonas_clima")
        .select("id, latitud, longitud, activo")
        .eq("activo", true)
      revisar(error)
      return (data ?? []) as ZonaClima[]
    },

    async crearCorrida(inicio) {
      const { data, error } = await supabase
        .from("cron_runs")
        .insert({ inicio, estado: "en_curso" })
        .select("id")
        .single()
      revisar(error)
      return (data as { id: string }).id
    },

    async cerrarCorridasInterrumpidas(idActual, inicioAntesDe, fin) {
      const { data, error } = await supabase
        .from("cron_runs")
        .update({ estado: "error", fin, detalle: { motivo: "interrumpida" } })
        .eq("estado", "en_curso")
        .lt("inicio", inicioAntesDe)
        .neq("id", idActual)
        .select("id")
      revisar(error)
      return data?.length ?? 0
    },

    async guardarClima(clima) {
      const { error } = await supabase.from("clima_diario").upsert(
        {
          latitud: clima.latitud,
          longitud: clima.longitud,
          fecha: clima.fecha,
          horas: clima.horas,
          fuente: clima.fuente,
          descargado_en: clima.descargadoEn,
        },
        { onConflict: "latitud,longitud,fecha" },
      )
      revisar(error)
    },

    async guardarRiesgo(riesgo) {
      const { error } = await supabase.from("riesgo_diario").upsert(
        {
          zona_clima_id: riesgo.zonaClimaId,
          fecha: riesgo.fecha,
          nivel: riesgo.nivel,
          indice: riesgo.indice,
          motivo: riesgo.motivo,
          detalle: riesgo.detalle,
          calculado_en: riesgo.calculadoEn,
        },
        { onConflict: "zona_clima_id,fecha" },
      )
      revisar(error)
    },

    async cerrarCorrida(id, cierre) {
      const { error } = await supabase
        .from("cron_runs")
        .update({
          fin: cierre.fin,
          estado: cierre.estado,
          zonas_ok: cierre.zonasOk,
          zonas_con_error: cierre.zonasConError,
          detalle: cierre.detalle,
        })
        .eq("id", id)
      revisar(error)
    },
  }
}
