"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { isCulqiPagoMetodo, isManualPagoMetodo } from "@/lib/payments/server"

export type PanelPagoItem = {
  id: string
  profileId: string
  fullName: string
  reference: string
  amount: number
  method: "yape" | "transfer" | "culqi" | "culqi_simulado"
  receiptName: string
  createdAt: string
  status: "sent" | "under_review" | "approved" | "rejected"
  rejectionReason?: string
  culqiChargeId?: string
}

function statusLabel(status: PanelPagoItem["status"]) {
  if (status === "approved") return "Aprobado"
  if (status === "rejected") return "Rechazado"
  return "En revisión"
}

function methodLabel(method: PanelPagoItem["method"]) {
  if (method === "culqi") return "Culqi"
  if (method === "culqi_simulado") return "Culqi (sim)"
  if (method === "transfer") return "Transferencia"
  return "Yape"
}

function isImageName(name: string) {
  return /\.(jpe?g|png|webp)$/i.test(name)
}

export function PanelPagosTable({ items }: { items: PanelPagoItem[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<PanelPagoItem | null>(null)
  const [tab, setTab] = useState<"manual" | "culqi">("manual")

  const manualItems = useMemo(() => items.filter((item) => isManualPagoMetodo(item.method)), [items])
  const culqiItems = useMemo(() => items.filter((item) => isCulqiPagoMetodo(item.method)), [items])
  const visible = tab === "manual" ? manualItems : culqiItems
  const pendingManual = manualItems.filter((item) => item.status === "under_review" || item.status === "sent")

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
      setMessage(action === "aprobar" ? "Pago aprobado y Premium anual activado." : "Pago rechazado.")
      setPreview(null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al revisar el pago.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={tab === "manual"}
          onClick={() => setTab("manual")}
          className={`min-h-10 rounded-xl border px-4 text-sm font-semibold ${
            tab === "manual" ? "border-coffee-700 bg-coffee-50 text-coffee-950" : "border-slate-200 text-slate-600"
          }`}
        >
          Manuales ({pendingManual.length} pendientes)
        </button>
        <button
          type="button"
          aria-pressed={tab === "culqi"}
          onClick={() => setTab("culqi")}
          className={`min-h-10 rounded-xl border px-4 text-sm font-semibold ${
            tab === "culqi" ? "border-coffee-700 bg-coffee-50 text-coffee-950" : "border-slate-200 text-slate-600"
          }`}
        >
          Culqi ({culqiItems.length})
        </button>
      </div>

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

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-coffee-200 bg-white p-8 text-center text-sm text-slate-600">
          {tab === "manual" ? "No hay comprobantes Yape/transferencia." : "Aún no hay pagos Culqi."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Referencia</th>
                <th className="px-4 py-3 font-semibold">Método</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">{tab === "culqi" ? "Cargo Culqi" : "Comprobante"}</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const busy = busyId === item.id
                const canReview =
                  isManualPagoMetodo(item.method) && (item.status === "under_review" || item.status === "sent")
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-coffee-950">{item.fullName}</p>
                      <p className="text-xs text-slate-500">{item.receiptName}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.reference}</td>
                    <td className="px-4 py-3 text-slate-700">{methodLabel(item.method)}</td>
                    <td className="px-4 py-3 text-slate-700">S/{item.amount}</td>
                    <td className="px-4 py-3 text-slate-700">{statusLabel(item.status)}</td>
                    <td className="px-4 py-3">
                      {isCulqiPagoMetodo(item.method) ? (
                        <span className="font-mono text-xs text-slate-600">{item.culqiChargeId ?? "—"}</span>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg border border-coffee-300 px-3 py-2 text-xs font-semibold text-coffee-900 hover:bg-coffee-50"
                          onClick={() => setPreview(item)}
                        >
                          Ver
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canReview ? (
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
                      ) : isCulqiPagoMetodo(item.method) ? (
                        <span className="text-xs font-semibold text-coffee-700">Automático</span>
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
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pago-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pago-preview-title" className="text-lg font-semibold text-coffee-950">
                  Comprobante {preview.reference}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {preview.fullName} · {preview.receiptName}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-coffee-900 hover:bg-coffee-50"
                onClick={() => setPreview(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {isImageName(preview.receiptName) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/pagos/${preview.id}/archivo`}
                  alt={`Comprobante ${preview.reference}`}
                  className="mx-auto max-h-[70vh] w-full object-contain"
                />
              ) : (
                <iframe
                  title={`Comprobante ${preview.reference}`}
                  src={`/api/pagos/${preview.id}/archivo`}
                  className="h-[70vh] w-full"
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/api/pagos/${preview.id}/archivo`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-coffee-300 px-4 text-sm font-semibold text-coffee-900 hover:bg-coffee-50"
              >
                Abrir en pestaña
              </a>
              {isManualPagoMetodo(preview.method) &&
                (preview.status === "under_review" || preview.status === "sent") && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === preview.id}
                      className="rounded-lg bg-coffee-800 px-4 py-2 text-sm font-semibold text-white hover:bg-coffee-900 disabled:opacity-60"
                      onClick={() => void review(preview.id, "aprobar")}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === preview.id}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                      onClick={() => void review(preview.id, "rechazar")}
                    >
                      Rechazar
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
