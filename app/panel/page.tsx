import { ShieldCheck } from "lucide-react"
import { panelResumenPayload } from "@/lib/auth/panel-access"

export default function PanelPage() {
  const resumen = panelResumenPayload()

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <section className="rounded-3xl bg-emerald-950 px-6 py-8 text-white sm:px-10">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800">
            <ShieldCheck className="size-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Superadministrador
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Panel del equipo</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-100/75">
              Vista reservada para el equipo de Café Guardián. Un caficultor no puede ver ni consultar estos datos.
            </p>
          </div>
        </div>
      </section>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Caficultores activos
          </p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{resumen.caficultoresActivos}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Diagnósticos de hoy
          </p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{resumen.diagnosticosHoy}</p>
        </section>
      </div>
    </main>
  )
}
