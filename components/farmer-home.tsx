"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Camera, History, Leaf, Lightbulb, Wifi, WifiOff } from "lucide-react"
import { homeContent as copy } from "@/content/home"
import { diagnosisCopy, getDiagnosisOrigin } from "@/content/diagnosis"
import { loadHomeOverview, type HomeOverview } from "@/lib/home/overview"

export function FarmerHome({ name }: { name: string }) {
  const [overview, setOverview] = useState<HomeOverview | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setOverview(null)
    void loadHomeOverview().then((result) => { if (active) setOverview(result) })
    return () => { active = false }
  }, [attempt])

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-coffee-950 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="cg-enter"><p className="cg-kicker">{copy.eyebrow}</p><p className="mt-5 text-lg font-semibold">{copy.greeting(name)}</p><h1 className="cg-display mt-2 text-4xl sm:text-5xl">{copy.title}</h1><p className="mt-4 max-w-xl text-base leading-7 text-coffee-700">{copy.description}</p></header>
        <section className="relative isolate mt-8 overflow-hidden rounded-2xl bg-coffee-900 p-6 text-white sm:p-9">
          <Image src="/images/granos-cafe.jpg" alt={copy.imageAlt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-coffee-950 via-coffee-950/95 to-coffee-950/50" />
          <Camera size={30} strokeWidth={1.5} aria-hidden="true" /><h2 className="mt-4 text-2xl font-semibold">{copy.action}</h2><p className="mt-2 max-w-md text-sm leading-7 text-coffee-100">{copy.actionDescription}</p><Link href="/diagnostico/nuevo" className="cg-button cg-button-light mt-5">{copy.action}<ArrowRight size={18} aria-hidden="true" /></Link><p className="mt-4 flex items-center gap-2 text-xs leading-5 text-coffee-100"><Wifi size={15} aria-hidden="true" />{copy.connection}</p>
        </section>
        <section className="mt-9" aria-labelledby="latest-title"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="latest-title" className="text-xl font-semibold">{copy.latest}</h2><Link href="/historial" className="cg-text-link"><History size={17} aria-hidden="true" />{copy.history}</Link></div>
          <div aria-live="polite" className="mt-3">
            {!overview && <p role="status" className="rounded-2xl border border-coffee-100 p-7 text-coffee-700">{copy.loading}</p>}
            {overview?.warning && <div role="status" className="mb-3 rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm leading-6">{copy[overview.warning]}<button className="ml-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4" onClick={() => setAttempt((value) => value + 1)}>{copy.retry}</button></div>}
            {overview?.latest ? <Link href={`/historial/${overview.latest.id}`} className="flex min-h-32 items-center gap-4 rounded-2xl border border-coffee-200 p-5 transition hover:bg-coffee-50"><span className="feature-icon"><Leaf aria-hidden="true" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{diagnosisCopy.labels[overview.latest.label]}</h3><p className="mt-1 text-sm text-coffee-700">{getDiagnosisOrigin(overview.latest.isDemo)}</p><p className="mt-1 text-sm text-coffee-700">{new Date(overview.latest.createdAt).toLocaleDateString("es-PE", { dateStyle: "medium" })}</p>{overview.latest.lote && <p className="mt-1 truncate text-sm">{overview.latest.lote}</p>}</div><span className="sr-only">{copy.openRecord}</span><ArrowRight className="shrink-0" size={20} aria-hidden="true" /></Link> : overview && overview.warning !== "unavailable" ? <div className="rounded-2xl border border-dashed border-coffee-300 bg-coffee-50 px-6 py-9 text-center"><Leaf className="mx-auto text-coffee-600" size={32} strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold">{copy.emptyTitle}</h3><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-coffee-700">{copy.emptyDescription}</p></div> : null}
          </div>
        </section>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">{[{ icon: Lightbulb, title: copy.tipTitle, description: copy.tip }, { icon: WifiOff, title: copy.savedTitle, description: copy.savedDescription }].map(({ icon: Icon, title, description }) => <section key={title} className="rounded-2xl border border-coffee-100 p-6"><Icon size={23} className="text-coffee-600" strokeWidth={1.5} aria-hidden="true" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-7 text-coffee-700">{description}</p></section>)}</div>
      </div>
    </main>
  )
}
