"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, CircleHelp, CreditCard, House, ListChecks, LogOut, MessageCircle, Phone, ShieldCheck, UserRound, Wallet } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { navigationContent as copy } from "@/content/navigation"
import { createClient } from "@/lib/supabase/client"
import type { AuthUserLike, Role } from "@/lib/auth/roles"

const icons = { home: House, history: ListChecks, team: ShieldCheck, account: UserRound, plans: CreditCard, payments: Wallet, contact: Phone, support: MessageCircle, help: CircleHelp }

export function AppNavigation({ role, user }: { role: Role | null; user?: AuthUserLike }) {
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
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
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => { document.removeEventListener("pointerdown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown) }
  }, [menuOpen])

  async function signOut() {
    setSigningOut(true)
    setSignOutError("")
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      router.replace("/login")
      router.refresh()
    } catch {
      setSignOutError(copy.signOutError)
      setSigningOut(false)
    }
  }

  function closeMenu() { setMenuOpen(false); setSignOutError("") }
  if (!role) return null

  return (
    <header className="border-b border-coffee-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
        <BrandMark />
        <div className="relative order-2 sm:order-3" ref={menuRef}>
          <button ref={triggerRef} type="button" aria-label={copy.openMenu} aria-expanded={menuOpen} aria-controls={menuOpen ? "user-account-menu" : undefined} onClick={() => setMenuOpen((open) => !open)} className="flex min-h-12 items-center gap-2 rounded-xl border border-coffee-200 px-3 text-sm font-semibold text-coffee-900 transition hover:bg-coffee-50">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-coffee-100">{avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : name.trim() ? <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span> : <UserRound size={18} aria-hidden="true" />}</span><span className="hidden sm:inline">{copy.account}</span><ChevronDown size={15} aria-hidden="true" />
          </button>
          {menuOpen && <div id="user-account-menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-40px)] rounded-2xl border border-coffee-200 bg-white p-2 text-coffee-950 shadow-xl"><div className="border-b border-coffee-100 px-3 py-3"><p className="font-semibold">{name || copy.account}</p>{user?.email && <p className="mt-1 truncate text-xs text-coffee-700">{user.email}</p>}</div><div className="py-2">{copy.menuLinks.map(({ href, label, icon }) => { const Icon = icons[icon]; return <Link key={href} href={href} onClick={closeMenu} aria-current={pathname === href ? "page" : undefined} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition hover:bg-coffee-50"><Icon size={18} className="text-coffee-600" aria-hidden="true" />{label}</Link> })}</div><div className="border-t border-coffee-100 pt-2">{signOutError && <p role="alert" className="mb-2 rounded-lg bg-coffee-50 p-3 text-sm">{signOutError}</p>}<button type="button" disabled={signingOut} onClick={() => void signOut()} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition hover:bg-coffee-50 disabled:opacity-60"><LogOut size={18} aria-hidden="true" />{signingOut ? copy.signingOut : copy.signOut}</button></div></div>}
        </div>
        <nav aria-label={copy.label} className="order-3 flex w-full items-center gap-2 border-t border-coffee-100 pt-2 sm:order-2 sm:w-auto sm:border-0 sm:pt-0">{copy.links.filter(({ href }) => href !== "/panel" || role === "superadministrador").map(({ href, label, icon }) => { const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`); const Icon = icons[icon]; return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition sm:flex-none ${active ? "bg-coffee-100 text-coffee-900" : "text-coffee-700 hover:bg-coffee-50"}`}><Icon size={18} aria-hidden="true" />{label}</Link> })}</nav>
      </div>
    </header>
  )
}
