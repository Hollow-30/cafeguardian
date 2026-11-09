"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Camera, CircleHelp, CreditCard, Leaf, ListChecks, LogOut, MessageCircle, Phone, ShieldCheck, UserRound, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { AuthUserLike, Role } from "@/lib/auth/roles"

const links = [
  { href: "/", label: "Inicio", icon: Leaf },
  { href: "/diagnostico/nuevo", label: "Nuevo diagnóstico", icon: Camera },
  { href: "/historial", label: "Historial", icon: ListChecks },
  { href: "/planes", label: "Planes", icon: CreditCard },
  { href: "/mis-pagos", label: "Mis pagos", icon: Wallet },
  { href: "/panel", label: "Panel del equipo", icon: ShieldCheck },
]

export function AppNavigation({ role, user }: { role: Role | null; user?: AuthUserLike }) {
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const metadataName = user?.user_metadata?.full_name
  const name = typeof metadataName === "string" ? metadataName : ""
  const metadataAvatar = user?.user_metadata?.avatar_url
  const avatarUrl = typeof metadataAvatar === "string" ? metadataAvatar : ""

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  async function signOut() {
    setSigningOut(true)
    setSignOutError("")
    const { error } = await createClient().auth.signOut()
    if (error) {
      setSignOutError("No se pudo cerrar la sesión. Inténtalo nuevamente.")
      setSigningOut(false)
      return
    }
    router.replace("/login")
    router.refresh()
  }

  function closeMenu() {
    setMenuOpen(false)
    setSignOutError("")
  }

  if (!role) return null

  return (
    <header className="border-b border-emerald-900/10 bg-white">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6"
      >
        {links.filter(({ href }) => href !== "/panel" || role === "superadministrador").map(({ href, label, icon: Icon }) => {
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
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            aria-label="Abrir menú de usuario"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "user-account-menu" : undefined}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-900/15 bg-emerald-950 text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : name ? (
              <span aria-hidden="true" className="text-sm font-bold">{name.trim().charAt(0).toUpperCase()}</span>
            ) : (
              <UserRound className="size-5" aria-hidden="true" />
            )}
          </button>
          {menuOpen && (
            <div
              id="user-account-menu"
              className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-2xl border border-white/10 bg-slate-950 p-2 text-white shadow-2xl"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{name || "Mi cuenta"}</p>
                {user?.email && <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}</p>}
              </div>
              <div className="border-t border-white/10 py-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Usuario</p>
                <Link href="/account" onClick={closeMenu} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white">
                  <UserRound className="size-4 text-emerald-300" aria-hidden="true" />Mi cuenta
                </Link>
              </div>
              <div className="border-t border-white/10 py-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Suscripción</p>
                <p className="px-3 py-1 text-sm font-medium text-white">Plan Gratuito</p>
                <Link href="/planes" onClick={closeMenu} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-emerald-300 transition hover:bg-white/10 hover:text-emerald-200">
                  <CreditCard className="size-4" aria-hidden="true" />Mejorar plan
                </Link>
              </div>
              <div className="border-t border-white/10 py-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Ayuda</p>
                <Link href="/contacto" onClick={closeMenu} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white">
                  <Phone className="size-4 text-emerald-300" aria-hidden="true" />Contacto
                </Link>
                <Link href="/soporte" onClick={closeMenu} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white">
                  <MessageCircle className="size-4 text-emerald-300" aria-hidden="true" />Soporte
                </Link>
                <Link href="/ayuda" onClick={closeMenu} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white">
                  <CircleHelp className="size-4 text-emerald-300" aria-hidden="true" />Centro de ayuda
                </Link>
              </div>
              <div className="border-t border-white/10 pt-2">
                {signOutError && <p role="alert" className="mb-2 rounded-lg bg-red-950/70 px-3 py-2 text-xs text-red-200">{signOutError}</p>}
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-red-500/10 px-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
