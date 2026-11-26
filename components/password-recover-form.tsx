"use client"

import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Loader2, Wifi } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { authContent as copy } from "@/content/auth"
import { passwordRecoveryRedirectTo } from "@/lib/auth/password-recovery"
import { createClient } from "@/lib/supabase/client"

export function PasswordRecoverForm({ initialError = "" }: { initialError?: string }) {
  const text = copy.recover
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState(initialError === "enlace" ? text.linkExpired : "")

  const alertTone = useMemo(() => (sent ? "status" : "alert"), [sent])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setMessage("")
    setSent(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordRecoveryRedirectTo(window.location.origin),
      })
      if (error) {
        setMessage(error.message.toLowerCase().includes("rate") ? text.sendError : text.sendError)
        return
      }
      setSent(true)
      setMessage(text.sent)
    } catch {
      setMessage(copy.connectionError)
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
          <Link href="/" className="cg-text-link mb-7">
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.back}
          </Link>
          <p className="cg-kicker">{text.eyebrow}</p>
          <h1 className="cg-display mt-3 text-4xl sm:text-5xl">{text.title}</h1>
          <p className="mb-8 mt-4 text-sm leading-7 text-coffee-700">{text.description}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              {copy.email}
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.emailPlaceholder}
                className="input"
              />
            </label>
            {message && (
              <p
                role={alertTone}
                className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6"
              >
                {message}
              </p>
            )}
            <button
              disabled={loading || sent}
              type="submit"
              className="cg-button mt-1 w-full disabled:cursor-wait disabled:opacity-70"
            >
              {loading && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
              {text.submit}
              {!loading && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
          <p className="mt-6 text-center text-sm leading-7 text-coffee-700">
            {text.switchPrompt}{" "}
            <Link href="/login" className="inline-flex min-h-12 items-center font-semibold text-coffee-900 underline underline-offset-4">
              {text.switchLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
