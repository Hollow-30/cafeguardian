"use client"

import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onQuickFilter: (value: string) => void
}

const filters = ["Alertas Climáticas", "Diagnósticos por Foto", "Guías SENASA / INIA"]

export function SearchBar({ value, onChange, onSubmit, onQuickFilter }: SearchBarProps) {
  return (
    <section aria-labelledby="search-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Consulta rápida</p>
          <h2 id="search-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Encuentra un registro</h2>
        </div>
        <SlidersHorizontal aria-hidden="true" className="size-5 text-slate-400" />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit() }} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="dashboard-search" className="sr-only">Buscar parcela, diagnóstico o alerta</label>
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input id="dashboard-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar parcela, diagnóstico o alerta..." className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
        </div>
        <Button type="submit" className="h-12 rounded-xl bg-emerald-700 px-6 text-white hover:bg-emerald-800">Buscar</Button>
      </form>
      <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos">
        {filters.map((filter) => <button key={filter} type="button" onClick={() => onQuickFilter(filter)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">{filter}</button>)}
      </div>
    </section>
  )
}
