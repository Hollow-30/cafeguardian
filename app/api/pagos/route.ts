import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { buildPagoObjectKey, rowToPagoPublico } from "@/lib/payments/server"
import { MAX_RECEIPT_BYTES, validateReceipt } from "@/lib/payments/validate"
import { uploadFotoObject } from "@/lib/r2/client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pagos")
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (data ?? []).map((row) => rowToPagoPublico(row as never)) })
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const form = await request.formData()
  const file = form.get("receipt")
  const methodRaw = String(form.get("method") ?? "yape")
  const method = methodRaw === "transfer" ? "transfer" : "yape"
  const amount = Number(form.get("amount") ?? 12)
  const reference =
    String(form.get("reference") ?? "").trim() ||
    `CG-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el comprobante." }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 })
  }

  const validation = validateReceipt(file)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })
  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "El comprobante debe pesar máximo 5 MB." }, { status: 413 })
  }

  const pagoId = randomUUID()
  const contentType = file.type || "application/octet-stream"
  const storagePath = buildPagoObjectKey(pagoId, contentType)
  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    await uploadFotoObject({ key: storagePath, body: bytes, contentType })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el comprobante." },
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pagos")
    .insert({
      id: pagoId,
      profile_id: user.id,
      referencia: reference,
      monto: amount,
      metodo: method,
      storage_path: storagePath,
      content_type: contentType,
      byte_size: file.size,
      receipt_name: file.name || "comprobante",
      estado: "en_revision",
    })
    .select("id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo registrar el pago." }, { status: 500 })
  }

  return NextResponse.json({ item: rowToPagoPublico(data as never) }, { status: 201 })
}
