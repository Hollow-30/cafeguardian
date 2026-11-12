"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Leaf } from "lucide-react"
import { diagnosisCopy, getDiagnosisOrigin, type DiagnosisKey } from "@/content/diagnosis"
import { filterDiagnoses, historyCopy, paginateDiagnoses, resultFilters, sortDiagnoses } from "@/content/history"
import { fetchFotosHistorial } from "@/lib/fotos/history-client"
import {
  localDiagnosisToEntry,
  mergeHistoryEntries,
  remoteFotoToEntry,
  type HistoryEntry,
} from "@/lib/historial/entries"
import { listDiagnoses } from "@/lib/storage/diagnosesRepo"
import { Button } from "@/components/ui/button"

export function HistorySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-2xl border border-coffee-100 p-4">
      <div className="h-24 rounded-xl bg-coffee-50" />
      <div className="h-5 w-2/3 rounded bg-coffee-50" />
      <div className="h-4 w-1/2 rounded bg-coffee-50" />
    </div>
  )
}

export function SyncStatusBadge({ status }: { status: HistoryEntry["status"] }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === "offline" ? "bg-coffee-50 text-coffee-900" : "bg-coffee-50 text-coffee-800"}`}>
      {status === "offline" ? historyCopy.offline : historyCopy.synced}
    </span>
  )
}

export function ResultFilter({
  value,
  onChange,
}: {
  value: "all" | DiagnosisKey
  onChange: (value: "all" | DiagnosisKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Filtrar por resultado">
      {resultFilters.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          size="sm"
          variant={value === filter.key ? "default" : "outline"}
          onClick={() => onChange(filter.key)}
          className={value === filter.key ? "bg-coffee-800 hover:bg-coffee-900" : "border-coffee-700 text-coffee-900"}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}

export function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const label = diagnosisCopy.labels[entry.label]
  const [thumb, setThumb] = useState(entry.imageUrl)

  useEffect(() => {
    if (entry.imageUrl) {
      setThumb(entry.imageUrl)
      return
    }
    if (!entry.blob) return
    const url = URL.createObjectURL(entry.blob)
    setThumb(url)
    return () => URL.revokeObjectURL(url)
  }, [entry.blob, entry.imageUrl])

  return (
    <Link
      href={`/historial/${entry.id}`}
      className="flex min-h-32 items-center gap-4 rounded-2xl border border-coffee-100 bg-white p-4 transition hover:border-coffee-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coffee-700/20"
    >
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-coffee-50">
        {thumb ? (
          <img src={thumb} alt={`Hoja con resultado ${label}`} className="size-full object-cover" />
        ) : (
          <Leaf className="size-8 text-coffee-700" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-coffee-950">{label}</h2>
          <SyncStatusBadge status={entry.status} />
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-700">{getDiagnosisOrigin(entry.isDemo)}</p>
        <p className="mt-1 text-sm text-slate-600">{new Date(entry.createdAt).toLocaleDateString("es-PE", { dateStyle: "medium" })}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">Confianza: {entry.confidence}%</p>
        {entry.lote ? <p className="mt-1 truncate text-sm text-slate-600">{entry.lote}</p> : null}
      </div>
      <ChevronRight className="shrink-0 text-coffee-700" aria-hidden="true" />
    </Link>
  )
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-coffee-700 bg-coffee-50 p-8 text-center">
      <Leaf className="size-10 text-coffee-700" aria-hidden="true" />
      <h2 className="text-xl font-bold text-coffee-950">{historyCopy.empty}</h2>
      <Link
        href="/diagnostico/nuevo"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-coffee-800 px-6 text-sm font-semibold text-white hover:bg-coffee-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coffee-700/20"
      >
        {historyCopy.emptyAction}
      </Link>
    </div>
  )
}

export function HistoryList() {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [filter, setFilter] = useState<"all" | DiagnosisKey>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState("")

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setWarning("")
      const local = (await listDiagnoses()).map(localDiagnosisToEntry)
      let remote: HistoryEntry[] = []
      try {
        remote = (await fetchFotosHistorial()).map(remoteFotoToEntry)
      } catch (cause) {
        if (active) {
          setWarning(
            cause instanceof Error
              ? `${cause.message} Mostrando solo lo guardado en este dispositivo.`
              : "No se pudo cargar el historial remoto.",
          )
        }
      }
      if (!active) return
      setItems(mergeHistoryEntries(remote, local))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => filterDiagnoses(items, filter), [items, filter])
  const visible = useMemo(() => paginateDiagnoses(sortDiagnoses(filtered), page), [filtered, page])
  const hasMore = visible.length < filtered.length

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coffee-700">Café Guardián</p>
          <h1 className="mt-2 text-3xl font-bold text-coffee-950">{historyCopy.title}</h1>
          <p className="mt-3 text-base leading-6 text-slate-600">
            Revisa tus diagnósticos guardados en la nube y los que quedaron offline en este dispositivo.
          </p>
        </header>
        {warning && (
          <p role="status" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm text-coffee-950">
            {warning}
          </p>
        )}
        <ResultFilter value={filter} onChange={(value) => { setFilter(value); setPage(1) }} />
        {loading ? (
          <div className="flex flex-col gap-3" aria-label={historyCopy.loading}>
            <HistorySkeleton />
            <HistorySkeleton />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-coffee-50 p-6 text-center text-slate-700">No hay resultados con este filtro.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visible.map((item) => <HistoryCard key={item.id} entry={item} />)}
            </div>
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPage((current) => current + 1)}
                className="h-12 border-coffee-700 text-coffee-900"
              >
                Cargar más
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
