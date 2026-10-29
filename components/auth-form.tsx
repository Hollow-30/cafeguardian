"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { ArrowRight, Eye, EyeOff, Leaf, Loader2, Sprout } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "register"

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const isRegister = mode === "register"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    const supabase = createClient()

    const result = isRegister
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL } })
      : await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      setMessage(result.error.message.includes("Invalid login") ? "El correo o la contraseña no son correctos." : result.error.message)
      setLoading(false)
      return
    }

    if (isRegister && !result.data.session) {
      setMessage("Revisa tu correo para confirmar tu cuenta antes de ingresar.")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-emerald-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute -right-28 top-16 size-96 rounded-full bg-emerald-800/40 blur-3xl" />
          <div className="relative">
            <Link href="/" className="flex items-center gap-3" aria-label="Volver al inicio">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 shadow-sm"><Sprout className="size-5" /></span>
              <span><strong className="block text-base tracking-tight">Café Guardián</strong><small className="text-emerald-200/70">Cuidado inteligente para tu cafetal</small></span>
            </Link>
          </div>
          <div className="relative max-w-md">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-800/70"><Leaf className="size-6 text-emerald-300" /></div>
            <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">Tu parcela, siempre bajo control.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-emerald-100/70">Guarda tus diagnósticos, recibe alertas a tiempo y toma mejores decisiones, incluso cuando la señal se va.</p>
          </div>
          <p className="relative text-xs text-emerald-200/50">Plataforma Offline-First para caficultores</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-950 lg:hidden"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-800 text-white"><Sprout className="size-4" /></span>Café Guardián</Link>
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{isRegister ? "Comienza hoy" : "Bienvenido de nuevo"}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">{isRegister ? "Crea tu cuenta" : "Ingresa a tu panel"}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{isRegister ? "Registra tu parcela y mantén tus cultivos protegidos." : "Continúa cuidando tu cafetal con información clara y oportuna."}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {isRegister && <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Nombre completo<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Juan Pérez" className="h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" /></label>}
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" className="h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Contraseña<div className="relative"><input required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-emerald-800" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
              {message && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">{message}</p>}
              <button disabled={loading} type="submit" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{isRegister ? "Crear mi cuenta" : "Ingresar al panel"}{!loading && <ArrowRight className="size-4" />}</button>
            </form>
            <p className="mt-8 text-center text-sm text-slate-500">{isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"}{" "}<Link href={isRegister ? "/login" : "/registro"} className="font-semibold text-emerald-800 hover:text-emerald-950">{isRegister ? "Inicia sesión" : "Regístrate gratis"}</Link></p>
          </div>
        </section>
      </div>
    </main>
  )
}
