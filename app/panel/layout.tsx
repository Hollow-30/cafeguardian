import Link from "next/link"
import { redirect } from "next/navigation"
import { authorizePanelAccess } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"

export const metadata = {
  title: "Panel del equipo | Café Guardián",
  description: "Panel del Superadministrador de Café Guardián.",
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const access = authorizePanelAccess(await getAuthUser())

  if (!access.ok) {
    redirect(access.status === 401 ? "/login" : "/acceso-denegado")
  }

  return (
    <div className="min-h-screen bg-[#faf7f4] text-slate-900">
      <div className="border-b border-coffee-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <nav aria-label="Administración" className="flex flex-wrap items-center gap-5 text-sm font-semibold text-coffee-900">
            <Link href="/panel" className="inline-flex min-h-12 items-center hover:text-coffee-950">
              Resumen
            </Link>
            <Link href="/panel/equipo" className="inline-flex min-h-12 items-center hover:text-coffee-950">
              Usuarios
            </Link>
            <Link href="/panel/pagos" className="hover:text-coffee-950">
              Pagos
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  )
}
