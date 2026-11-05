import { openDB, type DBSchema } from "idb"
import type { PaymentDraft, PaymentRequest } from "./types"

interface PaymentsDB extends DBSchema {
  payments: { key: string; value: PaymentRequest; indexes: { "by-created-at": string } }
}

const database = () => openDB<PaymentsDB>("cafe-guardian-payments", 1, {
  upgrade(db) {
    const store = db.createObjectStore("payments", { keyPath: "id" })
    store.createIndex("by-created-at", "createdAt")
  },
})

export async function savePayment(draft: PaymentDraft): Promise<PaymentRequest> {
  const payment: PaymentRequest = {
    ...draft,
    id: crypto.randomUUID(),
    reference: `CG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "sent",
  }
  await (await database()).put("payments", payment)
  return payment
}

export async function listPayments(): Promise<PaymentRequest[]> {
  return (await database()).getAllFromIndex("payments", "by-created-at").then((items) => items.reverse())
}

export async function updatePaymentStatus(id: string, status: PaymentRequest["status"], rejectionReason?: string): Promise<void> {
  const db = await database()
  const payment = await db.get("payments", id)
  if (!payment) return
  await db.put("payments", { ...payment, status, rejectionReason })
}
