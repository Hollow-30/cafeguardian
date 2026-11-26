import { NextResponse } from "next/server"
import { activarPremiumPerfil } from "@/lib/plans/suscripciones"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * Webhook Culqi (Basic auth).
 * CulqiPanel → Webhooks → charge creation succeeded/failed.
 * Env: CULQI_WEBHOOK_USER + CULQI_WEBHOOK_PASSWORD (o CULQI_WEBHOOK_SECRET).
 */
type CulqiWebhookPayload = {
  id?: string
  type?: string
  data?: {
    id?: string
    object?: string
    outcome?: { type?: string }
    metadata?: Record<string, string | number | undefined>
  }
}

function isAuthorized(request: Request): boolean {
  const user = process.env.CULQI_WEBHOOK_USER?.trim()
  const pass = process.env.CULQI_WEBHOOK_PASSWORD?.trim()
  const legacySecret = process.env.CULQI_WEBHOOK_SECRET?.trim()
  if (!user && !pass && !legacySecret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth.toLowerCase().startsWith("basic ")) {
    try {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8")
      const sep = decoded.indexOf(":")
      const authUser = sep >= 0 ? decoded.slice(0, sep) : decoded
      const authPass = sep >= 0 ? decoded.slice(sep + 1) : ""
      if (user && pass) return authUser === user && authPass === pass
      if (legacySecret) {
        return authUser === legacySecret || authPass === legacySecret || decoded === legacySecret
      }
    } catch {
      return false
    }
  }
  if (auth.toLowerCase().startsWith("bearer ") && legacySecret) {
    return auth.slice(7).trim() === legacySecret
  }
  return false
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let payload: CulqiWebhookPayload
  try {
    payload = (await request.json()) as CulqiWebhookPayload
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const chargeId = payload.data?.id?.trim()
  const type = (payload.type ?? "").toLowerCase()
  const outcome = (payload.data?.outcome?.type ?? "").toLowerCase()
  const profileId = String(payload.data?.metadata?.profile_id ?? "").trim()

  // Solo nos interesan cargos exitosos para conciliar Premium.
  const succeeded =
    type.includes("charge") &&
    (type.includes("succeeded") || outcome.includes("venta_exitosa") || outcome === "" || type.includes("creation"))

  if (!chargeId) {
    return NextResponse.json({ received: true, ignored: "sin charge id" })
  }

  if (!succeeded && (type.includes("failed") || outcome.includes("decline"))) {
    return NextResponse.json({ received: true, ignored: "cargo fallido" })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 })
  }

  const { data: pago } = await admin
    .from("pagos")
    .select("id, profile_id, estado")
    .eq("culqi_charge_id", chargeId)
    .maybeSingle()

  const targetProfile = pago?.profile_id ?? (profileId || null)
  if (!targetProfile) {
    return NextResponse.json({ received: true, ignored: "sin profile_id" })
  }

  if (pago && pago.estado !== "aprobado") {
    await admin
      .from("pagos")
      .update({
        estado: "aprobado",
        revisado_en: new Date().toISOString(),
      })
      .eq("id", pago.id)
  }

  try {
    await activarPremiumPerfil(admin, targetProfile, "premium_mensual")
  } catch (error) {
    return NextResponse.json(
      {
        received: true,
        error: error instanceof Error ? error.message : "No se pudo activar Premium.",
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ received: true, chargeId, profileId: targetProfile })
}
