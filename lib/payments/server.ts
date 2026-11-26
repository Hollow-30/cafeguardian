export type PagoEstadoDb = "en_revision" | "aprobado" | "rechazado"
export type PaymentStatusUi = "sent" | "under_review" | "approved" | "rejected"
export type PagoMetodo = "yape" | "transfer" | "culqi" | "culqi_simulado"

export type PagoPublico = {
  id: string
  reference: string
  amount: number
  method: PagoMetodo
  receiptName: string
  createdAt: string
  status: PaymentStatusUi
  rejectionReason?: string
  culqiChargeId?: string
}

export function isManualPagoMetodo(metodo: string): metodo is "yape" | "transfer" {
  return metodo === "yape" || metodo === "transfer"
}

export function isCulqiPagoMetodo(metodo: string): boolean {
  return metodo === "culqi" || metodo === "culqi_simulado"
}

export function mapPagoEstadoToUi(estado: PagoEstadoDb): PaymentStatusUi {
  if (estado === "aprobado") return "approved"
  if (estado === "rechazado") return "rejected"
  return "under_review"
}

export function buildPagoObjectKey(pagoId: string, contentType: string): string {
  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg"
  return `pagos/${pagoId}.${ext}`
}

export function rowToPagoPublico(row: {
  id: string
  referencia: string
  monto: number | string
  metodo: string
  receipt_name: string
  estado: PagoEstadoDb
  motivo_rechazo: string | null
  created_at: string
  culqi_charge_id?: string | null
}): PagoPublico {
  return {
    id: row.id,
    reference: row.referencia,
    amount: Number(row.monto),
    method:
      row.metodo === "transfer"
        ? "transfer"
        : row.metodo === "culqi"
          ? "culqi"
          : row.metodo === "culqi_simulado"
            ? "culqi_simulado"
            : "yape",
    receiptName: row.receipt_name,
    createdAt: row.created_at,
    status: mapPagoEstadoToUi(row.estado),
    rejectionReason: row.motivo_rechazo ?? undefined,
    culqiChargeId: row.culqi_charge_id ?? undefined,
  }
}
