"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Share2, Trash2, ZoomIn, ZoomOut } from "lucide-react"
import { diagnosisCopy, getDiagnosisOrigin } from "@/content/diagnosis"
import { historyCopy } from "@/content/history"
import { deleteFotoHistorial, fetchFotoHistorial, fetchFotosHistorial } from "@/lib/fotos/history-client"
import {
  localDiagnosisToEntry,
  mergeHistoryEntries,
  remoteFotoToEntry,
  type HistoryEntry,
} from "@/lib/historial/entries"
import {
  deleteDiagnosis,
  deleteDiagnosesByPhotoId,
  getDiagnosis,
  listDiagnoses,
  updateDiagnosisNote,
} from "@/lib/storage/diagnosesRepo"

export function diagnosisSummary(entry: HistoryEntry) {
  return `${getDiagnosisOrigin(entry.isDemo)}. Diagnóstico: ${diagnosisCopy.labels[entry.label]}. Confianza: ${entry.confidence}%. Fecha: ${new Date(entry.createdAt).toLocaleString("es-PE")}.`
}

export async function shareDiagnosis(entry: HistoryEntry, imageUrl: string) {
  const text = diagnosisSummary(entry)
  if (typeof navigator !== "undefined" && navigator.share && entry.blob) {
    await navigator.share({
      title: "Diagnóstico de hoja",
      text,
      files: [new File([entry.blob], "hoja.jpg", { type: entry.blob.type || "image/jpeg" })],
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
  const router = useRouter()
  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [all, setAll] = useState<HistoryEntry[]>([])
  const [note, setNote] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [zoom, setZoom] = useState(1)
  const [shareMessage, setShareMessage] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let objectUrl = ""

    void (async () => {
      setLoading(true)
      const localRows = await listDiagnoses()
      const localEntries = localRows.map(localDiagnosisToEntry)
      let remoteEntries: HistoryEntry[] = []
      try {
        remoteEntries = (await fetchFotosHistorial()).map(remoteFotoToEntry)
      } catch {
        remoteEntries = []
      }
      const merged = mergeHistoryEntries(remoteEntries, localEntries)
      let current = merged.find((item) => item.id === id) ?? null

      if (!current) {
        try {
          const remote = await fetchFotoHistorial(id)
          current = remoteFotoToEntry(remote.item)
        } catch {
          current = null
        }
      }

      if (!active) return
      setAll(merged.length ? merged : current ? [current] : [])
      setEntry(current)
      setNote(current?.note ?? "")

      if (current?.imageUrl) {
        setImageUrl(current.imageUrl)
      } else if (current?.blob) {
        objectUrl = URL.createObjectURL(current.blob)
        setImageUrl(objectUrl)
      } else {
        setImageUrl("")
      }
      setLoading(false)
    })()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  const index = entry ? all.findIndex((item) => item.id === entry.id) : -1
  const previous = index > 0 ? all[index - 1] : undefined
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined
  const date = entry
    ? new Date(entry.createdAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
    : ""

  async function persistNote(value: string) {
    setNote(value)
    const local = await getDiagnosis(id)
    if (local) await updateDiagnosisNote(id, value)
  }

  async function removeEntry() {
    if (!entry) return
    setDeleting(true)
    setDeleteError("")
    try {
      if (entry.remoteId) {
        await deleteFotoHistorial(entry.remoteId)
        await deleteDiagnosesByPhotoId(entry.remoteId)
      }
      if (entry.source === "local") {
        await deleteDiagnosis(entry.id)
      }
      router.push("/historial")
      router.refresh()
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "No se pudo eliminar.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-xl animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-coffee-50" />
          <div className="h-64 rounded-2xl bg-coffee-50" />
        </div>
      </main>
    )
  }

  if (!entry) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-xl">
          <Link href="/historial" className="inline-flex min-h-12 items-center text-coffee-800 underline">Volver al historial</Link>
          <h1 className="mt-10 text-3xl font-bold text-coffee-950">Registro no encontrado</h1>
          <p className="mt-3 text-lg text-slate-700">Este diagnóstico no está disponible o no tienes acceso.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <article className="mx-auto flex max-w-xl flex-col gap-5">
        <Link href="/historial" className="inline-flex min-h-12 items-center gap-2 text-coffee-800 underline">
          <ArrowLeft aria-hidden="true" />
          Historial
        </Link>
        <h1 className="text-3xl font-bold text-coffee-950">Detalle del diagnóstico</h1>
        <div className="overflow-hidden rounded-2xl border border-coffee-100 bg-coffee-50 p-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Hoja con resultado ${diagnosisCopy.labels[entry.label]}`}
              className="max-h-[28rem] w-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <p className="p-8 text-center text-sm text-slate-600">Sin imagen disponible.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" aria-label="Alejar imagen" className="min-h-12 rounded-xl border border-coffee-200 px-4 hover:bg-coffee-50" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>
            <ZoomOut aria-hidden="true" />
          </button>
          <button type="button" aria-label="Acercar imagen" className="min-h-12 rounded-xl border border-coffee-200 px-4 hover:bg-coffee-50" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>
            <ZoomIn aria-hidden="true" />
          </button>
        </div>
        <section className="rounded-2xl border border-coffee-100 p-5">
          <h2 className="text-2xl font-bold text-coffee-950">{diagnosisCopy.labels[entry.label]}</h2>
          <p className="mt-2 text-sm font-semibold">{getDiagnosisOrigin(entry.isDemo)}</p>
          <p className="mt-2 text-lg">Confianza: {entry.confidence}%</p>
          <p className="mt-1 text-sm text-slate-600">{date}</p>
          <p className="mt-1 text-sm text-slate-600">{entry.status === "offline" ? historyCopy.offline : historyCopy.synced}</p>
          {entry.lote && <p className="mt-2 text-sm">Lote o parcela: {entry.lote}</p>}
        </section>
        <label className="flex flex-col gap-2 font-semibold" htmlFor="diagnosis-note">
          Nota personal
          <textarea
            id="diagnosis-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void persistNote(note)}
            className="min-h-28 rounded-xl border border-coffee-200 p-3 font-normal outline-none focus:border-coffee-700 focus:ring-4 focus:ring-coffee-700/15"
            placeholder="Agrega una nota para recordar este registro"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-coffee-800 px-4 font-bold text-white hover:bg-coffee-900"
            onClick={() => void shareDiagnosis(entry, imageUrl).then((result) => setShareMessage(result === "fallback" ? "Imagen descargada y resumen copiado." : "Listo para compartir."))}
          >
            <Share2 aria-hidden="true" />
            Compartir con mi técnico
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-coffee-700 px-4 font-bold text-coffee-800 hover:bg-coffee-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden="true" />
            Eliminar registro
          </button>
        </div>
        {shareMessage && <p role="status" className="text-sm text-coffee-800">{shareMessage}</p>}
        {confirmDelete && (
          <div role="dialog" aria-modal="true" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4">
            <p className="font-semibold">¿Eliminar este registro?</p>
            <p className="mt-1 text-sm">
              Se borrará{entry.remoteId ? " de la nube (R2) y" : ""} de este dispositivo.
            </p>
            {deleteError && <p role="alert" className="mt-2 text-sm text-coffee-800">{deleteError}</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={deleting}
                className="min-h-12 rounded-xl bg-coffee-800 px-4 font-semibold text-white hover:bg-coffee-900 disabled:opacity-60"
                onClick={() => void removeEntry()}
              >
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                type="button"
                disabled={deleting}
                className="min-h-12 rounded-xl border border-coffee-300 px-4 hover:bg-white"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <nav aria-label="Navegar entre diagnósticos" className="flex justify-between gap-3 border-t border-coffee-100 pt-4">
          <Link aria-disabled={!previous} className={`inline-flex min-h-12 items-center gap-2 ${previous ? "text-coffee-800 underline" : "pointer-events-none text-slate-400"}`} href={previous ? `/historial/${previous.id}` : "#"}>
            <ArrowLeft aria-hidden="true" />
            Anterior
          </Link>
          <Link aria-disabled={!next} className={`inline-flex min-h-12 items-center gap-2 ${next ? "text-coffee-800 underline" : "pointer-events-none text-slate-400"}`} href={next ? `/historial/${next.id}` : "#"}>
            Siguiente
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </article>
    </main>
  )
}
