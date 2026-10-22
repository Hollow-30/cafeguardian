import { ChevronDown, Cloud, CloudOff, Droplets, FileText, Leaf, MapPin, ShieldAlert } from "lucide-react"
export interface RecordItem { id: number; zone: string; type: string; status: "offline" | "synced"; description: string; time: string; risk?: "low" | "medium" | "high" }

const iconByType = { "Alerta Climática": Droplets, "Diagnóstico por Foto": Leaf, "Guía Informativa": FileText }

export function DiagnosticCards({ records }: { records: RecordItem[] }) {
  if (!records.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No encontramos registros con esa búsqueda.</div>
  return <div className="flex flex-col gap-3">{records.map((record) => {
    const Icon = iconByType[record.type as keyof typeof iconByType] ?? FileText
    const statusLabel = record.status === "offline" ? "Guardado Offline" : "Sincronizado en la Nube"
    return <details key={record.id} className="group rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_-6px_rgba(15,23,42,0.25)] transition hover:border-emerald-200">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon aria-hidden="true" className="size-5" /></div>
        <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">{record.type}</span>{record.risk && <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${record.risk === "high" ? "text-red-700" : record.risk === "medium" ? "text-amber-700" : "text-emerald-700"}`}><ShieldAlert className="size-3.5" />{record.risk === "high" ? "Alto" : record.risk === "medium" ? "Moderado" : "Bajo"}</span>}</div><h3 className="truncate font-semibold text-slate-900">{record.zone}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5" />{record.time}</p></div>
        <div className="hidden shrink-0 items-center gap-1.5 text-xs text-slate-500 sm:flex">{record.status === "offline" ? <CloudOff className="size-4 text-amber-600" /> : <Cloud className="size-4 text-emerald-600" />}{statusLabel}</div><ChevronDown aria-hidden="true" className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-5 pt-4 text-sm leading-6 text-slate-600 sm:px-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:hidden">{record.status === "offline" ? <CloudOff className="size-4 text-amber-600" /> : <Cloud className="size-4 text-emerald-600" />}{statusLabel}</div>{record.description}</div>
    </details>
  })}</div>
}
