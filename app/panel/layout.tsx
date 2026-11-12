import Link from "next/link"
import { redirect } from "next/navigation"
import { Sprout } from "lucide-react"
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
      <header className="border-b border-coffee-950/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-coffee-800 text-white">
              <Sprout className="size-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight text-coffee-950">Café Guardián</p>
              <p className="text-xs text-slate-500">Panel del Superadministrador</p>
            </div>
          </div>
          <nav className="flex items-center gap-5 text-sm font-semibold text-coffee-900">
            <Link href="/panel" className="hover:text-coffee-950">
              Resumen
            </Link>
            <Link href="/panel/equipo" className="hover:text-coffee-950">
              Usuarios
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}