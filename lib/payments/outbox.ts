import type { PaymentRequest } from "./types"
import { listUnsyncedPayments, markPaymentSynced } from "./paymentsRepo"

/** Compat: cola en memoria ya no es la fuente de verdad; se usa IndexedDB. */
const memoryQueue: PaymentRequest[] = []

export function enqueuePayment(payment: PaymentRequest): void {
  memoryQueue.push(payment)
}

export function pendingPayments(): PaymentRequest[] {
  return [...memoryQueue]
}

/**
 * Reintenta pagos no sincronizados (IndexedDB + cola en memoria).
 * `send` debe subir el comprobante al servidor.
 */
export async function retryOutbox(
  isOnline: boolean,
  send: (payment: PaymentRequest) => Promise<{ id: string; status: PaymentRequest["status"] }>,
): Promise<number> {
  if (!isOnline) return 0

  const fromDb = await listUnsyncedPayments().catch(() => [] as PaymentRequest[])
  const byId = new Map<string, PaymentRequest>()
  for (const item of [...fromDb, ...memoryQueue]) byId.set(item.id, item)

  let sent = 0
  for (const payment of byId.values()) {
    try {
      const remote = await send(payment)
      try {
        await markPaymentSynced(payment.id, remote.id, remote.status)
      } catch {
        // IndexedDB puede fallar en tests o sin storage; igual se retira de la cola en memoria.
      }
      const idx = memoryQueue.findIndex((item) => item.id === payment.id)
      if (idx >= 0) memoryQueue.splice(idx, 1)
      sent += 1
    } catch {
      // Se conserva para el siguiente intento.
    }
  }
  return sent
}
