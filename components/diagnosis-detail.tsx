"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Share2, Trash2, ZoomIn, ZoomOut } from "lucide-react"
import { diagnosisCopy } from "@/content/diagnosis"
import { historyCopy } from "@/content/history"
import { getDiagnosis, listDiagnoses, updateDiagnosisNote, type StoredDiagnosis } from "@/lib/storage/diagnosesRepo"

export function diagnosisSummary(diagnosis: StoredDiagnosis) {
  return `Diagnóstico: ${diagnosisCopy.labels[diagnosis.label]}. Confianza: ${diagnosis.confidence}%. Fecha: ${new Date(diagnosis.createdAt).toLocaleString("es-PE")}.`
}

export async function shareDiagnosis(diagnosis: StoredDiagnosis, imageUrl: string) {
  const text = diagnosisSummary(diagnosis)
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      title: "Diagnóstico de hoja",
      text,
      files: [new File([diagnosis.blob], "hoja.jpg", { type: diagnosis.blob.type })],
    })
    return "shared" as const
  }
  const link = document.createElement("a")
  link.href = imageUrl
  link.download = "hoja-diagnostico.jpg"
  link.click()
  await navigator.clipboard?.writeText(text)
  return "fallback" as const
}

export function DiagnosisDetail({ id }: { id: string }) {
  const [diagnosis, setDiagnosis] = useState<StoredDiagnosis | null>(null)
  const [all, setAll] = useState<StoredDiagnosis[]>([])
  const [note, setNote] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [zoom, setZoom] = useState(1)
  const [shareMessage, setShareMessage] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl = ""
    void Promise.all([getDiagnosis(id), listDiagnoses()]).then(([item, items]) => {
      if (!active) return
      setDiagnosis(item ?? null)
      setAll(items)
      setNote(item?.note ?? "")
      if (item) {
        objectUrl = URL.createObjectURL(item.blob)
        setImageUrl(objectUrl)
      }
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  const index = diagnosis ? all.findIndex((item) => item.id === diagnosis.id) : -1
  const previous = index > 0 ? all[index - 1] : undefined
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined
  const date = diagnosis
    ? new Date(diagnosis.createdAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
    : ""

  if (!diagnosis) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-xl">
          <Link href="/historial" className="inline-flex min-h-12 items-center text-emerald-800 underline">Volver al historial</Link>
          <h1 className="mt-10 text-3xl font-bold text-emerald-950">Registro no encontrado</h1>
          <p className="mt-3 text-lg text-slate-700">Este diagnóstico no está disponible en este teléfono.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <article className="mx-auto flex max-w-xl flex-col gap-5">
        <Link href="/historial" className="inline-flex min-h-12 items-center gap-2 text-emerald-800 underline">
          <ArrowLeft aria-hidden="true" />
          Historial
        </Link>
        <h1 className="text-3xl font-bold text-emerald-950">Detalle del diagnóstico</h1>
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-2">
          <img
            src={imageUrl}
            alt={`Hoja con resultado ${diagnosisCopy.labels[diagnosis.label]}`}
            className="max-h-[28rem] w-full object-contain transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
        <div className="flex gap-3">
          <button type="button" aria-label="Alejar imagen" className="min-h-12 rounded-xl border border-emerald-200 px-4 hover:bg-emerald-50" onClick={() => setZoom((value) => Math.max(1, value - .25))}>
            <ZoomOut aria-hidden="true" />
          </button>
          <button type="button" aria-label="Acercar imagen" className="min-h-12 rounded-xl border border-emerald-200 px-4 hover:bg-emerald-50" onClick={() => setZoom((value) => Math.min(2, value + .25))}>
            <ZoomIn aria-hidden="true" />
          </button>
        </div>
        <section className="rounded-2xl border border-emerald-100 p-5">
          <h2 className="text-2xl font-bold text-emerald-950">{diagnosisCopy.labels[diagnosis.label]}</h2>
          <p className="mt-2 text-lg">Confianza: {diagnosis.confidence}%</p>
          <p className="mt-1 text-sm text-slate-600">{date}</p>
          <p className="mt-1 text-sm text-slate-600">{diagnosis.status === "offline" ? historyCopy.offline : historyCopy.synced}</p>
          {diagnosis.lote && <p className="mt-2 text-sm">Lote o parcela: {diagnosis.lote}</p>}
        </section>
        <label className="flex flex-col gap-2 font-semibold" htmlFor="diagnosis-note">
          Nota personal
          <textarea
            id="diagnosis-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void updateDiagnosisNote(id, note)}
            className="min-h-28 rounded-xl border border-emerald-200 p-3 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15"
            placeholder="Agrega una nota para recordar este registro"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 font-bold text-white hover:bg-emerald-900"
            onClick={() => void shareDiagnosis(diagnosis, imageUrl).then((result) => setShareMessage(result === "fallback" ? "Imagen descargada y resumen copiado." : "Listo para compartir."))}
          >
            <Share2 aria-hidden="true" />
            Compartir con mi técnico
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-700 px-4 font-bold text-red-800 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden="true" />
            Eliminar registro
          </button>
        </div>
        {shareMessage && <p role="status" className="text-sm text-green-800">{shareMessage}</p>}
        {confirmDelete && (
          <div role="dialog" aria-modal="true" className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold">¿Eliminar este registro?</p>
            <p className="mt-1 text-sm">La eliminación completa estará disponible próximamente.</p>
            <button type="button" className="mt-3 min-h-12 rounded-xl border border-red-300 px-4 hover:bg-white" onClick={() => setConfirmDelete(false)}>
              Cerrar
            </button>
          </div>
        )}
        <nav aria-label="Navegar entre diagnósticos" className="flex justify-between gap-3 border-t border-emerald-100 pt-4">
          <Link aria-disabled={!previous} className={`inline-flex min-h-12 items-center gap-2 ${previous ? "text-emerald-800 underline" : "pointer-events-none text-slate-400"}`} href={previous ? `/historial/${previous.id}` : "#"}>
            <ArrowLeft aria-hidden="true" />
            Anterior
          </Link>
          <Link aria-disabled={!next} className={`inline-flex min-h-12 items-center gap-2 ${next ? "text-emerald-800 underline" : "pointer-events-none text-slate-400"}`} href={next ? `/historial/${next.id}` : "#"}>
            Siguiente
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </article>
    </main>
  )
}
