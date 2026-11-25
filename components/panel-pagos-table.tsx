"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export type PanelPagoItem = {
  id: string
  profileId: string
  fullName: string
  reference: string
  amount: number
  method: "yape" | "transfer"
  receiptName: string
  createdAt: string
  status: "sent" | "under_review" | "approved" | "rejected"
  rejectionReason?: string
}

function statusLabel(status: PanelPagoItem["status"]) {
  if (status === "approved") return "Aprobado"
  if (status === "rejected") return "Rechazado"
  return "En revisión"
}

export function PanelPagosTable({ items }: { items: PanelPagoItem[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function review(pagoId: string, action: "aprobar" | "rechazar") {
    setBusyId(pagoId)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/api/panel/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          pago_id: pagoId,
          action,
          motivo: action === "rechazar" ? "Comprobante no válido" : undefined,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(body.error ?? "No se pudo revisar el pago.")
      setMessage(action === "aprobar" ? "Pago aprobado y Premium activado." : "Pago rechazado.")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al revisar el pago.")
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-coffee-200 bg-white p-8 text-center text-sm text-slate-600">
        No hay comprobantes registrados.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p role="status" className="rounded-xl border border-coffee-200 bg-coffee-50 p-3 text-sm text-coffee-950">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Referencia</th>
              <th className="px-4 py-3 font-semibold">Método</th>
              <th className="px-4 py-3 font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const busy = busyId === item.id
              const pending = item.status === "under_review" || item.status === "sent"
              return (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-coffee-950">{item.fullName}</p>
                    <p className="text-xs text-slate-500">{item.receiptName}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.reference}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{item.method}</td>
                  <td className="px-4 py-3 text-slate-700">S/{item.amount}</td>
                  <td className="px-4 py-3 text-slate-700">{statusLabel(item.status)}</td>
                  <td className="px-4 py-3">
                    {pending ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg bg-coffee-800 px-3 py-2 text-xs font-semibold text-white hover:bg-coffee-900 disabled:opacity-60"
                          onClick={() => void review(item.id, "aprobar")}
                        >
                          {busy ? "…" : "Aprobar"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => void review(item.id, "rechazar")}
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
