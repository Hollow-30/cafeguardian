import { NextResponse } from "next/server"

import { crearAlmacenSupabase } from "@/lib/cron/almacen-supabase"
import { estaAutorizado } from "@/lib/cron/autorizacion"
import { ejecutarCorridaRiesgo } from "@/lib/cron/ejecutar-corrida"
import { createAdminClient } from "@/lib/supabase/admin"
import { descargarClima } from "@/lib/weather/open-meteo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// Supuesto a validar: 60 s alcanzan para una descarga por punto (el tope de Hobby es 300 s).
export const maxDuration = 60

// Vercel Cron llama a esta ruta con GET y "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  // 1) Autorización antes de tocar nada: sin secreto configurado o con uno malo, 401.
  if (!estaAutorizado(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2) Cliente de base con service role. Si faltan variables, no se hace nada.
  let almacen
  try {
    almacen = crearAlmacenSupabase(createAdminClient())
  } catch {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 })
  }

  // 3) Corrida. Los detalles de los fallos quedan en cron_runs, no en la respuesta.
  try {
    const resultado = await ejecutarCorridaRiesgo({
      ahora: new Date(),
      almacen,
      descargarClima,
    })
    return NextResponse.json(
      {
        run_id: resultado.runId,
        date: resultado.fecha,
        status: resultado.estado,
        zones_ok: resultado.zonasOk,
        zones_failed: resultado.zonasConError,
      },
      { status: resultado.estado === "error" ? 500 : 200 },
    )
  } catch {
    return NextResponse.json({ error: "No se pudo completar la corrida" }, { status: 500 })
  }
}
