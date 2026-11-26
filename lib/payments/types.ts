export type PaymentStatus = "sent" | "under_review" | "approved" | "rejected"

export type PaymentRequest = {
  id: string
  reference: string
  amount: number
  method: "yape" | "transfer"
  receipt: Blob
  receiptName: string
  createdAt: string
  status: PaymentStatus
  rejectionReason?: string
  /** false = pendiente de enviar al servidor (outbox persistente). */
  synced?: boolean
  remoteId?: string | null
}

export type PaymentDraft = Omit<PaymentRequest, "id" | "reference" | "createdAt" | "status" | "synced" | "remoteId">

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
  return current === next || (current === "sent" && next === "under_review") || (current === "under_review" && (next === "approved" || next === "rejected"))
}
