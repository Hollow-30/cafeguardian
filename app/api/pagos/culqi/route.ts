import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { activarPremiumPerfil } from "@/lib/plans/suscripciones"
import { rowToPagoPublico } from "@/lib/payments/server"
import { uploadFotoObject } from "@/lib/r2/client"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const AMOUNT = 12

/**
 * Cargo simulado Culqi: valida token tok_test_*, registra pago aprobado y activa Premium.
 * Sin llaves reales de Culqi.
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
  if (!tokenId.startsWith("tok_test_")) {
    return NextResponse.json(
      { error: "Token inválido. Solo se aceptan tokens del simulador Culqi." },
      { status: 400 },
    )
  }

  const pagoId = randomUUID()
  const reference = `CQ-${Date.now().toString(36).toUpperCase()}-${tokenId.slice(-4).toUpperCase()}`
  const lastFour = (body.last_four ?? "0000").replace(/\D/g, "").slice(-4) || "0000"
  const storagePath = `pagos/${pagoId}.culqi-simulado.txt`
  const receiptBody = Buffer.from(
    `Culqi simulador\ntoken=${tokenId}\nemail=${body.email ?? ""}\nlast4=${lastFour}\namount=${AMOUNT}\n`,
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

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY para activar Premium con el simulador." },
      { status: 500 },
    )
  }

  const { data: pago, error: insertError } = await admin
    .from("pagos")
    .insert({
      id: pagoId,
      profile_id: user.id,
      referencia: reference,
      monto: AMOUNT,
      metodo: "culqi_simulado",
      storage_path: storagePath,
      content_type: "text/plain",
      byte_size: receiptBody.byteLength,
      receipt_name: `culqi-simulado-${lastFour}.txt`,
      estado: "aprobado",
      revisado_por: user.id,
      revisado_en: new Date().toISOString(),
    })
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at")
    .single()

  if (insertError || !pago) {
    return NextResponse.json(
      { error: insertError?.message ?? "No se pudo registrar el pago simulado." },
      { status: 500 },
    )
  }

  try {
    await activarPremiumPerfil(admin, user.id, "basico_anual")
  } catch (error) {
    return NextResponse.json(
      {
        item: rowToPagoPublico(pago as never),
        error: error instanceof Error ? error.message : "Pago registrado, pero no se pudo activar Premium.",
        simulated: true,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      item: rowToPagoPublico(pago as never),
      charge: {
        id: `chr_test_${pagoId.replace(/-/g, "").slice(0, 12)}`,
        amount: AMOUNT,
        currency: "PEN",
        outcome: "approved",
        message: "Pago simulado aceptado. Premium activado.",
        tokenId,
        simulated: true,
      },
      simulated: true,
    },
    { status: 201 },
  )
}
