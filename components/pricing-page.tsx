"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, LockKeyhole, Sparkles } from "lucide-react"
import { pricingContent, freePhotoQuota } from "@/content/pricing"
import { getPlanStatus, photosRemaining, type PlanUser } from "@/lib/plans"
import type { PlanEstadoResponse } from "@/lib/plans/estado"

const emptyUser: PlanUser = { plan: "free", photosUsedThisMonth: 0 }

export function PricingPage() {
  const [estado, setEstado] = useState<PlanEstadoResponse | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/planes/estado", { credentials: "same-origin", cache: "no-store" })
        const body = (await response.json().catch(() => ({}))) as PlanEstadoResponse & { error?: string }
        if (!response.ok) throw new Error(body.error ?? "No se pudo cargar tu plan.")
        if (active) setEstado(body)
      } catch (cause) {
        if (active) {
          setEstado(null)
          setError(cause instanceof Error ? cause.message : "No se pudo cargar tu plan.")
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const user = estado?.user ?? emptyUser
  const status = estado?.status ?? getPlanStatus(user)
  const remaining = estado?.remaining ?? photosRemaining(user)
  const used = user.photosUsedThisMonth
  const quota = estado?.quota ?? freePhotoQuota
  const exhausted = status.plan === "free" && remaining === 0
  const endsOn = estado?.endsOn ?? null
  const endsOnLabel = endsOn
    ? new Date(endsOn + "T00:00:00").toLocaleDateString("es-PE", { dateStyle: "long" })
    : null
  const planTitle = status.isTrial ? "Prueba" : status.plan === "premium" ? "Premium" : "Gratis"

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-coffee-950 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-fit rounded-lg px-1 py-2 text-sm font-semibold text-coffee-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coffee-700"
          >
            Café Guardián
          </Link>
          <div className="flex items-center gap-2 text-coffee-700">
            <Sparkles aria-hidden="true" />
            <span className="font-semibold">Planes</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pricingContent.title}</h1>
          <p className="max-w-xl text-lg text-coffee-950/75">{pricingContent.subtitle}</p>
        </header>

        {error && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {error}
          </p>
        )}

        <section aria-label="Estado de tu plan" className="rounded-2xl border border-coffee-700/30 bg-coffee-50 p-5">
          {loading ? (
            <p className="text-sm text-coffee-950/70">Cargando tu plan y fotos del mes…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-coffee-700">
                    {pricingContent.currentPlan}
                  </p>
                  <p className="text-2xl font-bold">{planTitle}</p>
                  {status.isTrial && endsOnLabel && (
                    <p className="mt-1 text-sm text-coffee-950/70">Termina el {endsOnLabel}</p>
                  )}
                  {!status.isTrial && status.premiumActive && endsOnLabel && (
                    <p className="mt-1 text-sm text-coffee-950/70">Vigente hasta el {endsOnLabel}</p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold">
                    {status.isTrial
                      ? `${status.trialDaysRemaining} días restantes de prueba`
                      : status.premiumActive
                        ? "Premium activo"
                        : "Tu plan está listo"}
                  </p>
                  <p className="text-sm text-coffee-950/70">
                    {status.plan === "premium"
                      ? `Fotos ${pricingContent.unlimitedPhotos}`
                      : `${used} de ${quota} ${pricingContent.usedPhotos}`}
                  </p>
                </div>
              </div>
              {exhausted && (
                <p className="mt-3 text-sm font-semibold text-coffee-800">{pricingContent.quotaExhausted}</p>
              )}
            </>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Planes disponibles">
          {pricingContent.plans.map((plan) => {
            const current = status.plan === plan.id
            return (
              <article
                key={plan.id}
                className={`flex flex-col gap-5 rounded-2xl border-2 p-6 ${
                  current ? "border-coffee-700 bg-coffee-50" : "border-coffee-900/15 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                    <p className="mt-1 text-sm text-coffee-950/70">{plan.cadence}</p>
                  </div>
                  {current && (
                    <span className="rounded-full bg-coffee-800 px-3 py-1 text-xs font-bold text-white">
                      {pricingContent.currentPlan}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="ml-2 rounded-full bg-coffee-100 px-2 py-1 text-xs font-semibold">
                    {pricingContent.referentialLabel}
                  </span>
                </div>
                <ul className="flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <Check aria-hidden="true" className="mt-0.5 shrink-0 text-coffee-700" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.id === "premium" && !current && (
                  <Link
                    href="/planes/pagar"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coffee-800 px-5 py-3 font-bold text-white hover:bg-coffee-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coffee-700"
                  >
                    {pricingContent.nextStep}
                  </Link>
                )}
                {plan.id === "free" && (
                  <p className="flex items-center gap-2 text-sm text-coffee-950/70">
                    <LockKeyhole aria-hidden="true" /> {pricingContent.noCard}
                  </p>
                )}
              </article>
            )
          })}
        </section>
        <p className="text-center text-sm text-coffee-950/70">{pricingContent.trial}</p>
      </div>
    </main>
  )
}
