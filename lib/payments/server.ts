export type PagoEstadoDb = "en_revision" | "aprobado" | "rechazado"
export type PaymentStatusUi = "sent" | "under_review" | "approved" | "rejected"

export type PagoPublico = {
  id: string
  reference: string
  amount: number
  method: "yape" | "transfer"
  receiptName: string
  createdAt: string
  status: PaymentStatusUi
  rejectionReason?: string
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
}): PagoPublico {
  return {
    id: row.id,
    reference: row.referencia,
    amount: Number(row.monto),
    method: row.metodo === "transfer" ? "transfer" : "yape",
    receiptName: row.receipt_name,
    createdAt: row.created_at,
    status: mapPagoEstadoToUi(row.estado),
    rejectionReason: row.motivo_rechazo ?? undefined,
  }
}
