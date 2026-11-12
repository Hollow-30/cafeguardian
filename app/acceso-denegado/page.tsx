import Link from "next/link"
import { ShieldOff, Sprout } from "lucide-react"

export const metadata = {
  title: "Acceso denegado | Café Guardián",
  description: "No tienes permiso para abrir esta pantalla.",
}

export default function AccesoDenegadoPage() {
  return (
    <main className="min-h-screen bg-[#faf7f4] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-coffee-800 text-white">
            <Sprout className="size-5" />
          </span>
          <strong className="tracking-tight text-coffee-950">Café Guardián</strong>
        </div>
        <div className="rounded-3xl border border-coffee-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-coffee-50 text-coffee-800">
            <ShieldOff className="size-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-800">
            Acceso denegado
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-coffee-950">
            Esta pantalla es solo para el equipo
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Tu cuenta de Caficultor no puede abrir el panel del Superadministrador ni consultar sus datos.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-coffee-800 px-5 text-sm font-semibold text-white hover:bg-coffee-900"
          >
            Volver a mi cafetal
          </Link>
        </div>
      </div>
    </main>
  )
}
