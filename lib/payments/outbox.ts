import type { PaymentRequest } from "./types"

const queue: PaymentRequest[] = []

export function enqueuePayment(payment: PaymentRequest): void {
  queue.push(payment)
}

export function pendingPayments(): PaymentRequest[] {
  return [...queue]
}

export async function retryOutbox(isOnline: boolean, send: (payment: PaymentRequest) => Promise<void>): Promise<number> {
  if (!isOnline) return 0
  let sent = 0
  for (const payment of [...queue]) {
    try {
      await send(payment)
      queue.splice(queue.indexOf(payment), 1)
      sent += 1
    } catch {
      // Se conserva la solicitud para el siguiente intento.
    }
  }
  return sent
}
