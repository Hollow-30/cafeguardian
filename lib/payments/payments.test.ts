import { describe, expect, it, vi } from "vitest"
import { MAX_RECEIPT_BYTES, validateReceipt } from "./validate"
import { enqueuePayment, pendingPayments, retryOutbox } from "./outbox"
import { canTransitionPayment } from "./types"
import type { PaymentRequest } from "./types"

const payment = { id: "1", reference: "CG-1", amount: 12, method: "yape", receipt: new Blob(), receiptName: "x.pdf", createdAt: "2026-01-01", status: "sent" } as PaymentRequest

describe("validación de comprobantes", () => {
  it("acepta formatos permitidos y rechaza tamaño mayor a 5 MB", () => {
    expect(validateReceipt({ type: "application/pdf", size: MAX_RECEIPT_BYTES })).toBeNull()
    expect(validateReceipt({ type: "image/gif", size: 10 })).toBeTruthy()
    expect(validateReceipt({ type: "image/png", size: MAX_RECEIPT_BYTES + 1 })).toBeTruthy()
  })
})

describe("transiciones de estado", () => {
  it("permite enviado, revisión y decisión final", () => {
    expect(canTransitionPayment("sent", "under_review")).toBe(true)
    expect(canTransitionPayment("under_review", "approved")).toBe(true)
    expect(canTransitionPayment("under_review", "rejected")).toBe(true)
  })
})

describe("outbox", () => {
  it("reintenta y retira solicitudes enviadas", async () => {
    enqueuePayment(payment)
    const sent = await retryOutbox(true, vi.fn().mockResolvedValue(undefined))
    expect(sent).toBe(1)
    expect(pendingPayments()).not.toContain(payment)
  })
})
