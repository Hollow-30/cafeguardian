"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Wifi } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { authContent as copy } from "@/content/auth"
import { createClient } from "@/lib/supabase/client"
import { postLoginPathForRequest, resolveRole } from "@/lib/auth/roles"
import { publicSignupUserMetadata } from "@/lib/auth/superadmin-provision"

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
  const text = copy[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setMessage("")
    try {
      const supabase = createClient()
      const result = isRegister
        ? await supabase.auth.signUp({ email, password, options: { data: publicSignupUserMetadata(name), emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL } })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) {
        setMessage(result.error.message.includes("Invalid login") ? copy.invalidLogin : isRegister ? copy.registerError : copy.loginError)
        return
      }
      if (isRegister && !result.data.session) { setMessage(copy.checkEmail); return }
      const user = result.data.session?.user ?? result.data.user
      const requestedPath = new URLSearchParams(window.location.search).get("next")
      router.push(postLoginPathForRequest(resolveRole(user), requestedPath))
      router.refresh()
    } catch { setMessage(copy.connectionError) }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-screen bg-white text-coffee-950 lg:grid-cols-2">
      <section className="relative isolate hidden overflow-hidden bg-coffee-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Image src="/images/caficultor.jpg" alt={copy.imageAlt} fill sizes="50vw" className="-z-20 object-cover object-[38%]" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-coffee-950 via-coffee-950/75 to-coffee-950/65" />
        <BrandMark light />
        <div className="max-w-md pb-10"><h2 className="cg-display !text-white text-5xl xl:text-6xl">{copy.title}</h2><p className="mt-6 text-base leading-8 text-coffee-100">{copy.description}</p><p className="mt-10 flex items-center gap-2 text-xs leading-6 text-coffee-100"><Wifi size={16} aria-hidden="true" />{copy.note}</p></div>
      </section>
      <section className="flex items-center justify-center px-6 py-9 sm:px-10">
        <div className="w-full max-w-md cg-enter"><div className="mb-8 lg:hidden"><BrandMark /></div><Link href="/" className="cg-text-link mb-7"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</Link><p className="cg-kicker">{text.eyebrow}</p><h1 className="cg-display mt-3 text-4xl sm:text-5xl">{text.title}</h1><p className="mb-8 mt-4 text-sm leading-7 text-coffee-700">{text.description}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
            {isRegister && <label className="flex flex-col gap-2 text-sm font-semibold">{copy.name}<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} className="input" /></label>}
            <label className="flex flex-col gap-2 text-sm font-semibold">{copy.email}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.emailPlaceholder} className="input" /></label>
            <div className="flex flex-col gap-2 text-sm font-semibold"><label htmlFor="auth-password">{copy.password}</label><div className="relative"><input required minLength={6} type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} id="auth-password" placeholder={copy.passwordPlaceholder} className="input pr-14" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex min-h-12 min-w-12 items-center justify-center rounded-xl text-coffee-700" aria-label={showPassword ? copy.hidePassword : copy.showPassword}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div></div>
            {message && <p role="alert" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6">{message}</p>}
            <button disabled={loading} type="submit" className="cg-button mt-1 w-full disabled:cursor-wait disabled:opacity-70">{loading && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}{text.submit}{!loading && <ArrowRight size={18} aria-hidden="true" />}</button>
          </form>
          <p className="mt-6 text-center text-sm leading-7 text-coffee-700">{text.switchPrompt}{" "}<Link href={isRegister ? "/login" : "/registro"} className="inline-flex min-h-12 items-center font-semibold text-coffee-900 underline underline-offset-4">{text.switchLabel}</Link></p>
        </div>
      </section>
    </main>
  )
}
