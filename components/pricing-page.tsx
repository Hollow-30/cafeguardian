"use client"

import Link from "next/link"
import { Check, LockKeyhole, Sparkles } from "lucide-react"
import { pricingContent, freePhotoQuota } from "@/content/pricing"
import { getPlanStatus, photosRemaining, type PlanUser } from "@/lib/plans"

const demoUser: PlanUser = { plan: "premium", trialStartedAt: "2026-11-01T12:00:00Z", photosUsedThisMonth: 3 }

export function PricingPage() {
  const status = getPlanStatus(demoUser, new Date())
  const remaining = photosRemaining(demoUser)
  const used = demoUser.photosUsedThisMonth

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-emerald-950 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">{pricingContent.demoLabel}</span>
          <Link href="/" className="w-fit rounded-lg px-1 py-2 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Café Guardián</Link>
          <div className="flex items-center gap-2 text-emerald-700"><Sparkles aria-hidden="true" /><span className="font-semibold">Planes</span></div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pricingContent.title}</h1>
          <p className="max-w-xl text-lg text-emerald-950/75">{pricingContent.subtitle}</p>
        </header>

        <section aria-label="Estado de tu plan" className="rounded-2xl border border-emerald-700/30 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{pricingContent.currentPlan}</p><p className="text-2xl font-bold">{status.plan === "premium" ? "Premium" : "Gratis"}</p></div>
            <div className="text-left sm:text-right"><p className="font-semibold">{status.isTrial ? `${status.trialDaysRemaining} días restantes de prueba` : "Tu plan está listo"}</p><p className="text-sm text-emerald-950/70">{used} de {" "}{status.plan === "premium" ? pricingContent.unlimitedPhotos : freePhotoQuota}{" "}{pricingContent.usedPhotos}</p></div>
          </div>
          {status.plan === "free" && <p className="mt-3 text-sm font-semibold text-red-800">{pricingContent.quotaExhausted}</p>}
        </section>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Planes disponibles">
          {pricingContent.plans.map((plan) => {
            const current = status.plan === plan.id
            return <article key={plan.id} className={`flex flex-col gap-5 rounded-2xl border-2 p-6 ${current ? "border-emerald-700 bg-emerald-50" : "border-emerald-900/15 bg-white"}`}>
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{plan.name}</h2><p className="mt-1 text-sm text-emerald-950/70">{plan.cadence}</p></div>{current && <span className="rounded-full bg-emerald-800 px-3 py-1 text-xs font-bold text-white">{pricingContent.currentPlan}</span>}</div>
              <div><span className="text-4xl font-bold">{plan.price}</span><span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold">{pricingContent.referentialLabel}</span></div>
              <ul className="flex flex-1 flex-col gap-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" /> <span>{feature}</span></li>)}</ul>
              {plan.id === "premium" && !current && <Link href="/planes/pagar" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{pricingContent.nextStep}</Link>}
              {plan.id === "free" && <p className="flex items-center gap-2 text-sm text-emerald-950/70"><LockKeyhole aria-hidden="true" /> {pricingContent.noCard}</p>}
            </article>
          })}
        </section>
        <p className="text-center text-sm text-emerald-950/70">{pricingContent.trial}</p>
      </div>
    </main>
  )
}
