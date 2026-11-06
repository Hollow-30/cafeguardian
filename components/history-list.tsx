"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Leaf } from "lucide-react"
import { diagnosisCopy, type DiagnosisKey } from "@/content/diagnosis"
import { filterDiagnoses, historyCopy, paginateDiagnoses, resultFilters, sortDiagnoses } from "@/content/history"
import { listDiagnoses, type StoredDiagnosis } from "@/lib/storage/diagnosesRepo"
import { Button } from "@/components/ui/button"

export function HistorySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-2xl border border-emerald-100 p-4">
      <div className="h-24 rounded-xl bg-emerald-50" />
      <div className="h-5 w-2/3 rounded bg-emerald-50" />
      <div className="h-4 w-1/2 rounded bg-emerald-50" />
    </div>
  )
}

export function SyncStatusBadge({ status }: { status: StoredDiagnosis["status"] }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === "offline" ? "bg-emerald-50 text-emerald-900" : "bg-green-50 text-green-800"}`}>
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
          className={value === filter.key ? "bg-emerald-800 hover:bg-emerald-900" : "border-emerald-700 text-emerald-900"}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}

export function HistoryCard({ diagnosis }: { diagnosis: StoredDiagnosis }) {
  const label = diagnosisCopy.labels[diagnosis.label]

  return (
    <Link
      href={`/historial/${diagnosis.id}`}
      className="flex min-h-32 items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 transition hover:border-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20"
    >
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
        <img src={URL.createObjectURL(diagnosis.blob)} alt={`Hoja con resultado ${label}`} className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-emerald-950">{label}</h2>
          <SyncStatusBadge status={diagnosis.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{new Date(diagnosis.createdAt).toLocaleDateString("es-PE", { dateStyle: "medium" })}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">Confianza: {diagnosis.confidence}%</p>
      </div>
      <ChevronRight className="shrink-0 text-emerald-700" aria-hidden="true" />
    </Link>
  )
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-emerald-700 bg-emerald-50 p-8 text-center">
      <Leaf className="size-10 text-emerald-700" aria-hidden="true" />
      <h2 className="text-xl font-bold text-emerald-950">{historyCopy.empty}</h2>
      <Link
        href="/diagnostico/nuevo"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20"
      >
        {historyCopy.emptyAction}
      </Link>
    </div>
  )
}

export function HistoryList() {
  const [items, setItems] = useState<StoredDiagnosis[]>([])
  const [filter, setFilter] = useState<"all" | DiagnosisKey>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listDiagnoses().then(setItems).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => filterDiagnoses(items, filter), [items, filter])
  const visible = useMemo(() => paginateDiagnoses(sortDiagnoses(filtered), page), [filtered, page])
  const hasMore = visible.length < filtered.length

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Café Guardián</p>
          <h1 className="mt-2 text-3xl font-bold text-emerald-950">{historyCopy.title}</h1>
          <p className="mt-3 text-base leading-6 text-slate-600">{historyCopy.description}</p>
        </header>
        <ResultFilter value={filter} onChange={(value) => { setFilter(value); setPage(1) }} />
        {loading ? (
          <div className="flex flex-col gap-3" aria-label={historyCopy.loading}>
            <HistorySkeleton />
            <HistorySkeleton />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-emerald-50 p-6 text-center text-slate-700">No hay resultados con este filtro.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visible.map((item) => <HistoryCard key={item.id} diagnosis={item} />)}
            </div>
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPage((current) => current + 1)}
                className="h-12 border-emerald-700 text-emerald-900"
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
