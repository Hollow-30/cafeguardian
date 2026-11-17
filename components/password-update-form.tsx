"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Wifi } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { authContent as copy } from "@/content/auth"
import { postLoginPathForRequest, resolveRole } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/client"

export function PasswordUpdateForm() {
  const router = useRouter()
  const text = copy.newPassword
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setHasSession(Boolean(data.user))
      setChecking(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError("")
    setMessage("")
    if (password !== confirm) {
      setError(text.mismatch)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        setError(text.missingSession)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(text.updateError)
        return
      }
      setMessage(text.success)
      const requestedPath = new URLSearchParams(window.location.search).get("next")
      router.push(postLoginPathForRequest(resolveRole(userData.user), requestedPath))
      router.refresh()
    } catch {
      setError(copy.connectionError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white text-coffee-950 lg:grid-cols-2">
      <section className="relative isolate hidden overflow-hidden bg-coffee-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Image src="/images/caficultor.jpg" alt={copy.imageAlt} fill sizes="50vw" className="-z-20 object-cover object-[38%]" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-coffee-950 via-coffee-950/75 to-coffee-950/65" />
        <BrandMark light />
        <div className="max-w-md pb-10">
          <h2 className="cg-display !text-white text-5xl xl:text-6xl">{copy.title}</h2>
          <p className="mt-6 text-base leading-8 text-coffee-100">{copy.description}</p>
          <p className="mt-10 flex items-center gap-2 text-xs leading-6 text-coffee-100">
            <Wifi size={16} aria-hidden="true" />
            {copy.note}
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-9 sm:px-10">
        <div className="w-full max-w-md cg-enter">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <Link href="/login" className="cg-text-link mb-7">
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.recover.switchLabel}
          </Link>
          <p className="cg-kicker">{text.eyebrow}</p>
          <h1 className="cg-display mt-3 text-4xl sm:text-5xl">{text.title}</h1>
          <p className="mb-8 mt-4 text-sm leading-7 text-coffee-700">{text.description}</p>

          {checking ? (
            <p className="text-sm text-coffee-700">Comprobando el enlace…</p>
          ) : !hasSession ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6">
                {text.missingSession}
              </p>
              <Link
                href="/recuperar"
                className="cg-button inline-flex w-full items-center justify-center"
              >
                Solicitar un enlace nuevo
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
              <div className="flex flex-col gap-2 text-sm font-semibold">
                <label htmlFor="new-password">{copy.password}</label>
                <div className="relative">
                  <input
                    required
                    minLength={6}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    id="new-password"
                    placeholder={copy.passwordPlaceholder}
                    className="input pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex min-h-12 min-w-12 items-center justify-center rounded-xl text-coffee-700"
                    aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                {text.confirm}
                <input
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  className="input"
                />
              </label>
              {error && (
                <p role="alert" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6">
                  {message}
                </p>
              )}
              <button disabled={loading} type="submit" className="cg-button mt-1 w-full disabled:cursor-wait disabled:opacity-70">
                {loading && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
                {text.submit}
                {!loading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
