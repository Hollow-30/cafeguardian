import { NextResponse } from "next/server"
import { authorizePanelAccess } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"
import { activarPremiumPerfil, vencerPremiumPerfil } from "@/lib/plans/suscripciones"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const access = authorizePanelAccess(await getAuthUser())
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  let body: { profile_id?: string; action?: string; plan_codigo?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  const profileId = body.profile_id?.trim() ?? ""
  const action = body.action?.trim() ?? ""
  if (!profileId || !["activar", "vencer"].includes(action)) {
    return NextResponse.json(
      { error: "Indica profile_id y action (activar|vencer)." },
      { status: 400 },
    )
  }

  try {
    const admin = createAdminClient()
    if (action === "vencer") {
      const count = await vencerPremiumPerfil(admin, profileId)
      return NextResponse.json({ ok: true, action, vencidas: count })
    }

    const planCodigo =
      body.plan_codigo === "prueba_30"
        ? "prueba_30"
        : body.plan_codigo === "premium_mensual"
          ? "premium_mensual"
          : "basico_anual"
    const created = await activarPremiumPerfil(admin, profileId, planCodigo)
    return NextResponse.json({ ok: true, action, ...created }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la suscripción." },
      { status: 500 },
    )
  }
}
