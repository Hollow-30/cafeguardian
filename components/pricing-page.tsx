import Link from "next/link"
import { Check } from "lucide-react"
import { pricingContent } from "@/content/pricing"

export function PricingPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-coffee-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex min-h-12 items-center text-sm font-semibold text-coffee-800 underline underline-offset-4">Volver al inicio</Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-coffee-700">Planes</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{pricingContent.title}</h1>
        <p className="mt-3 max-w-xl leading-7 text-coffee-800">Conoce las opciones previstas para Café Guardián. Los precios y beneficios son referenciales.</p>
        <section aria-label="Planes disponibles" className="mt-8 grid gap-5 md:grid-cols-2">
          {pricingContent.plans.map((plan) => (
            <article key={plan.id} className="flex flex-col rounded-2xl border border-coffee-200 p-6">
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-coffee-700">{plan.cadence}</p>
              <p className="mt-5 text-3xl font-bold">{plan.price} <span className="text-sm font-normal text-coffee-700">referencial</span></p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">{plan.features.filter((feature) => feature !== "[Por confirmar]").map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="size-5 shrink-0 text-coffee-700" aria-hidden="true" />{feature}</li>)}</ul>
              {plan.id === "premium" && <Link href="/planes/pagar" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-coffee-800 px-5 font-bold text-white hover:bg-coffee-900">Consultar disponibilidad</Link>}
            </article>
          ))}
        </section>
        <p className="mt-6 text-sm leading-6 text-coffee-700">El estado de tu plan todavía no está disponible en esta pantalla.</p>
      </div>
    </main>
  )
}
