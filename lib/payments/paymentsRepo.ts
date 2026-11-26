import { openDB, type DBSchema } from "idb"
import type { PaymentDraft, PaymentRequest } from "./types"

interface PaymentsDB extends DBSchema {
  payments: { key: string; value: PaymentRequest; indexes: { "by-created-at": string } }
}

const database = () =>
  openDB<PaymentsDB>("cafe-guardian-payments", 2, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains("payments")) {
        db.createObjectStore("payments", { keyPath: "id" })
      }
      const store = transaction.objectStore("payments")
      if (!store.indexNames.contains("by-created-at")) {
        store.createIndex("by-created-at", "createdAt")
      }
    },
  })

export async function savePayment(draft: PaymentDraft & { synced?: boolean }): Promise<PaymentRequest> {
  const payment: PaymentRequest = {
    ...draft,
    id: crypto.randomUUID(),
    reference: `CG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "sent",
    synced: draft.synced ?? false,
    remoteId: null,
  }
  await (await database()).put("payments", payment)
  return payment
}

export async function listPayments(): Promise<PaymentRequest[]> {
  return (await database()).getAllFromIndex("payments", "by-created-at").then((items) => items.reverse())
}

export async function listUnsyncedPayments(): Promise<PaymentRequest[]> {
  const all = await listPayments()
  return all.filter((item) => item.synced === false)
}

export async function markPaymentSynced(id: string, remoteId: string, status: PaymentRequest["status"]): Promise<void> {
  const db = await database()
  const payment = await db.get("payments", id)
  if (!payment) return
  await db.put("payments", { ...payment, synced: true, remoteId, status })
}

export async function updatePaymentStatus(id: string, status: PaymentRequest["status"], rejectionReason?: string): Promise<void> {
  const db = await database()
  const payment = await db.get("payments", id)
  if (!payment) return
  await db.put("payments", { ...payment, status, rejectionReason })
}
