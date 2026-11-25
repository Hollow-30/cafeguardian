import type { PaymentRequest } from "./types"
import type { PagoPublico } from "./server"

export async function sendPaymentToServer(payment: PaymentRequest): Promise<PagoPublico> {
  const form = new FormData()
  form.append("receipt", payment.receipt, payment.receiptName)
  form.append("method", payment.method)
  form.append("amount", String(payment.amount))
  form.append("reference", payment.reference)

  let response: Response
  try {
    response = await fetch("/api/pagos", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      cache: "no-store",
    })
  } catch {
    throw new Error("No se pudo enviar el comprobante. Revisa tu conexión.")
  }

  const body = (await response.json().catch(() => ({}))) as { item?: PagoPublico; error?: string }
  if (!response.ok || !body.item) {
    throw new Error(body.error ?? "No se pudo registrar el pago.")
  }
  return body.item
}

export async function fetchMisPagos(): Promise<PagoPublico[]> {
  const response = await fetch("/api/pagos", { credentials: "same-origin", cache: "no-store" })
  const body = (await response.json().catch(() => ({}))) as { items?: PagoPublico[]; error?: string }
  if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar tus pagos.")
  return body.items ?? []
}
