import { NextResponse } from "next/server"
import { estaAutorizado } from "@/lib/cron/autorizacion"
import { expirePastDueSubscriptions } from "@/lib/plans/suscripciones"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Vence suscripciones caducadas (Premium / prueba). Llamar con CRON_SECRET. */
export async function GET(request: Request) {
  if (!estaAutorizado(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const count = await expirePastDueSubscriptions(createAdminClient())
    return NextResponse.json({ ok: true, vencidas: count })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron vencer suscripciones." },
      { status: 500 },
    )
  }
}
