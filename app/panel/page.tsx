import Link from "next/link"
import { ShieldCheck, Users } from "lucide-react"
import { getPanelResumen } from "@/lib/panel/data"

export default async function PanelPage() {
  const resumen = await getPanelResumen()

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <section className="rounded-3xl bg-coffee-950 px-6 py-8 text-white sm:px-10">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-coffee-800">
            <ShieldCheck className="size-6 text-coffee-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-300">
              Superadministrador
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Panel del equipo</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-coffee-100/75">
              Resumen real de caficultores, planes y diagnósticos del día.
              Solo visible para el Superadministrador.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Caficultores
          </p>
          <p className="mt-3 text-3xl font-semibold text-coffee-950">
            {resumen.caficultoresActivos}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Con plan activo
          </p>
          <p className="mt-3 text-3xl font-semibold text-coffee-950">
            {resumen.premiumActivos}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Sin plan / gratis
          </p>
          <p className="mt-3 text-3xl font-semibold text-coffee-950">
            {resumen.gratisOSinPlan}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Diagnósticos de hoy
          </p>
          <p className="mt-3 text-3xl font-semibold text-coffee-950">
            {resumen.diagnosticosHoy}
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Link
          href="/panel/equipo"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-coffee-800 px-5 text-sm font-semibold text-white hover:bg-coffee-900"
        >
          <Users className="size-4" />
          Ver lista de usuarios y plan
        </Link>
      </div>
    </main>
  )
}
