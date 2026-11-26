"use client"

import { useEffect } from "react"
import { syncOfflineDiagnoses } from "@/lib/fotos/offline-sync"
import { sendPaymentToServer } from "@/lib/payments/api-client"
import { retryOutbox } from "@/lib/payments/outbox"

/** Registra SW (si existe) y reintenta sync de fotos/pagos al volver online. */
export function OfflineSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch(() => undefined)
    }

    const run = () => {
      void syncOfflineDiagnoses()
      void retryOutbox(navigator.onLine, async (payment) => {
        const item = await sendPaymentToServer(payment)
        return { id: item.id, status: item.status }
      })
    }

    run()
    window.addEventListener("online", run)
    return () => window.removeEventListener("online", run)
  }, [])

  return null
}
