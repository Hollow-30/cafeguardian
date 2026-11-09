"use client"

import Link from "next/link"
import { Camera, MapPin, Sprout } from "lucide-react"

export function FarmerHome({ name }: { name: string }) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start gap-4 rounded-3xl bg-emerald-950 px-6 py-8 text-white sm:px-10">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800">
              <Sprout className="size-6 text-emerald-300" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Panel del caficultor</p>
              <h1 className="mt-2 text-3xl font-semibold">Hola, {name || "caficultor"}.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-100/75">
                Tus herramientas para registrar observaciones y consultar tu cafetal.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Accesos rápidos">
          <Link
            href="/diagnostico/nuevo"
            className="flex min-h-40 items-center gap-5 rounded-2xl border border-emerald-100 bg-white p-6 transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Camera aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-lg text-emerald-950">Nuevo diagnóstico</strong>
              <span className="mt-1 block text-sm text-slate-600">Toma o elige una foto de hoja.</span>
            </span>
          </Link>
          <section className="flex min-h-40 items-center gap-5 rounded-2xl border border-emerald-100 bg-white p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <MapPin aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">Tu cafetal</h2>
              <p className="mt-1 text-sm text-slate-600">Accede al historial, planes y pagos desde los botones de navegación.</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
