import { NextResponse } from "next/server"
import { authorizePanelAccess } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"
import { activarPremiumPerfil } from "@/lib/plans/suscripciones"
import { rowToPagoPublico, type PagoEstadoDb } from "@/lib/payments/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET() {
  const access = authorizePanelAccess(await getAuthUser())
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pagos")
    .select(
      "id, profile_id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at, profiles(full_name)",
    )
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      ...rowToPagoPublico(row as never),
      profileId: row.profile_id as string,
      fullName: (profile as { full_name?: string } | null)?.full_name ?? "Sin nombre",
    }
  })

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const reviewer = await getAuthUser()
  const access = authorizePanelAccess(reviewer)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  let body: { pago_id?: string; action?: string; motivo?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  const pagoId = body.pago_id?.trim() ?? ""
  const action = body.action?.trim() ?? ""
  if (!pagoId || !["aprobar", "rechazar"].includes(action)) {
    return NextResponse.json({ error: "Indica pago_id y action (aprobar|rechazar)." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: pago, error: loadError } = await admin
    .from("pagos")
    .select("id, profile_id, estado")
    .eq("id", pagoId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (!pago) return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 })
  if (pago.estado !== "en_revision") {
    return NextResponse.json({ error: "Este pago ya fue revisado." }, { status: 409 })
  }

  const estado: PagoEstadoDb = action === "aprobar" ? "aprobado" : "rechazado"
  const motivo = action === "rechazar" ? (body.motivo?.trim() || "Comprobante no válido") : null

  // Primero marca el pago; si falla la activación, el admin puede reintentar.
  const { data: updated, error: updateError } = await admin
    .from("pagos")
    .update({
      estado,
      motivo_rechazo: motivo,
      revisado_por: reviewer?.id ?? null,
      revisado_en: new Date().toISOString(),
    })
    .eq("id", pagoId)
    .eq("estado", "en_revision")
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at")
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: "Este pago ya fue revisado." }, { status: 409 })
  }

  if (action === "aprobar") {
    try {
      await activarPremiumPerfil(admin, pago.profile_id, "basico_anual")
    } catch (error) {
      return NextResponse.json(
        {
          item: rowToPagoPublico(updated as never),
          error: error instanceof Error ? error.message : "Pago marcado, pero no se pudo activar Premium.",
        },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({ item: rowToPagoPublico(updated as never) })
}
