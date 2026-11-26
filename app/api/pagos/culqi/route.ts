import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { createCulqiCharge } from "@/lib/payments/culqi/charge"
import { activarPremiumPerfil } from "@/lib/plans/suscripciones"
import { rowToPagoPublico } from "@/lib/payments/server"
import { uploadFotoObject } from "@/lib/r2/client"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const AMOUNT = 12

/**
 * Cargo Culqi real (tkn_*) con CULQI_SECRET_KEY, o simulador local (tok_test_*) sin llaves.
 * Activa Premium mensual automáticamente (sin revisión del admin).
 */
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  let body: { token_id?: string; email?: string; last_four?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  const tokenId = body.token_id?.trim() ?? ""
  const email = (body.email ?? user.email ?? "").trim()
  const lastFour = (body.last_four ?? "0000").replace(/\D/g, "").slice(-4) || "0000"
  const secretKey = process.env.CULQI_SECRET_KEY?.trim()
  const isSimulatorToken = tokenId.startsWith("tok_test_")
  const isCulqiToken = tokenId.startsWith("tkn_")

  if (!isSimulatorToken && !isCulqiToken) {
    return NextResponse.json({ error: "Token Culqi inválido." }, { status: 400 })
  }

  if (isCulqiToken && !secretKey) {
    return NextResponse.json(
      { error: "Falta CULQI_SECRET_KEY para cobrar con Culqi." },
      { status: 500 },
    )
  }

  if (isSimulatorToken && secretKey) {
    return NextResponse.json(
      { error: "Con Culqi configurado usa el checkout real (token tkn_*)." },
      { status: 400 },
    )
  }

  let chargeId = `chr_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`
  let chargeMessage = "Pago simulado aceptado. Premium activado."
  let simulated = isSimulatorToken
  let metodo: "culqi" | "culqi_simulado" = isSimulatorToken ? "culqi_simulado" : "culqi"

  if (isCulqiToken && secretKey) {
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Correo requerido para el cargo Culqi." }, { status: 400 })
    }
    try {
      const charge = await createCulqiCharge({
        tokenId,
        email,
        metadata: { profile_id: user.id, plan: "premium_mensual" },
      })
      if (charge.outcome !== "approved") {
        return NextResponse.json({ error: charge.message }, { status: 402 })
      }
      chargeId = charge.id
      chargeMessage = charge.message
      simulated = false
      metodo = "culqi"
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Culqi rechazó el pago." },
        { status: 402 },
      )
    }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY para activar Premium." },
      { status: 500 },
    )
  }

  // Idempotencia: si el cargo ya está registrado, no duplicar.
  const { data: existing } = await admin
    .from("pagos")
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at, culqi_charge_id")
    .eq("culqi_charge_id", chargeId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      item: rowToPagoPublico(existing as never),
      charge: {
        id: chargeId,
        amount: AMOUNT,
        currency: "PEN",
        outcome: "approved",
        message: "Pago Culqi ya registrado.",
        tokenId,
        simulated,
      },
      simulated,
      reused: true,
    })
  }

  const pagoId = randomUUID()
  const reference = `CQ-${Date.now().toString(36).toUpperCase()}-${tokenId.slice(-4).toUpperCase()}`
  const storagePath = `pagos/${pagoId}.${metodo}.txt`
  const receiptBody = Buffer.from(
    `Culqi ${simulated ? "simulador" : "real"}\ncharge=${chargeId}\ntoken=${tokenId}\nemail=${email}\nlast4=${lastFour}\namount=${AMOUNT}\n`,
    "utf8",
  )

  try {
    await uploadFotoObject({
      key: storagePath,
      body: receiptBody,
      contentType: "text/plain",
    })
  } catch {
    // En local sin R2 igual registramos el pago.
  }

  const { data: pago, error: insertError } = await admin
    .from("pagos")
    .insert({
      id: pagoId,
      profile_id: user.id,
      referencia: reference,
      monto: AMOUNT,
      metodo,
      storage_path: storagePath,
      content_type: "text/plain",
      byte_size: receiptBody.byteLength,
      receipt_name: `culqi-${lastFour}.txt`,
      estado: "aprobado",
      revisado_por: user.id,
      revisado_en: new Date().toISOString(),
      culqi_charge_id: chargeId,
    })
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at, culqi_charge_id")
    .single()

  if (insertError || !pago) {
    return NextResponse.json(
      { error: insertError?.message ?? "No se pudo registrar el pago." },
      { status: 500 },
    )
  }

  try {
    await activarPremiumPerfil(admin, user.id, "premium_mensual")
  } catch (error) {
    return NextResponse.json(
      {
        item: rowToPagoPublico(pago as never),
        error: error instanceof Error ? error.message : "Pago registrado, pero no se pudo activar Premium.",
        simulated,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      item: rowToPagoPublico(pago as never),
      charge: {
        id: chargeId,
        amount: AMOUNT,
        currency: "PEN",
        outcome: "approved",
        message: chargeMessage,
        tokenId,
        simulated,
      },
      simulated,
    },
    { status: 201 },
  )
}
