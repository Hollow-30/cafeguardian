"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Camera, CreditCard, Leaf, ListChecks, LogIn, ShieldCheck, UserPlus, Wallet } from "lucide-react"

const links = [
  { href: "/", label: "Inicio", icon: Leaf },
  { href: "/diagnostico/nuevo", label: "Nuevo diagnóstico", icon: Camera },
  { href: "/historial", label: "Historial", icon: ListChecks },
  { href: "/planes", label: "Planes", icon: CreditCard },
  { href: "/mis-pagos", label: "Mis pagos", icon: Wallet },
  { href: "/login", label: "Ingresar", icon: LogIn },
  { href: "/registro", label: "Crear cuenta", icon: UserPlus },
  { href: "/panel", label: "Panel del equipo", icon: ShieldCheck },
]

export function AppNavigation() {
  const pathname = usePathname()

  return (
    <header className="border-b border-emerald-900/10 bg-white">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20 ${
                active
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-emerald-900/15 bg-white text-emerald-950 hover:border-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
