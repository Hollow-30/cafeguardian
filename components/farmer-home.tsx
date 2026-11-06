"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, LogOut, MapPin, Sprout } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function FarmerHome({ name }: { name: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    setError("")
    const { error: signOutError } = await createClient().auth.signOut()
    if (signOutError) {
      setError("No se pudo cerrar la sesión. Inténtalo nuevamente.")
      setLoading(false)
      return
    }
    router.replace("/login")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 rounded-3xl bg-emerald-950 px-6 py-8 text-white sm:px-10">
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
          <button
            type="button"
            disabled={loading}
            onClick={() => void signOut()}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {loading ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </header>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}

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
