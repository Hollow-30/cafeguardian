"use client"

import { useState, type FormEvent } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { paymentContent as copy } from "@/content/payments"
import { createCulqiSimulator } from "@/lib/payments/culqi/mock"
import type { PagoPublico } from "@/lib/payments/server"

type Props = {
  onSuccess: (pago: PagoPublico, message: string) => void
}

export function CulqiSimulatorForm({ onSuccess }: Props) {
  const [email, setEmail] = useState("")
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242")
  const [expMonth, setExpMonth] = useState("12")
  const [expYear, setExpYear] = useState("30")
  const [cvv, setCvv] = useState("123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const culqi = createCulqiSimulator()
      const token = await culqi.createToken({ cardNumber, expMonth, expYear, cvv, email })
      const response = await fetch("/api/pagos/culqi", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: token.id,
          email,
          last_four: token.lastFour,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        item?: PagoPublico
        error?: string
        charge?: { message?: string }
      }
      if (!response.ok || !body.item) {
        throw new Error(body.error ?? "No se pudo completar el pago simulado.")
      }
      onSuccess(body.item, body.charge?.message ?? copy.cardSuccess)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error en el simulador Culqi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-coffee-100 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-coffee-50 text-coffee-800">
          <CreditCard className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-coffee-950">{copy.cardTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.cardHint}</p>
        </div>
      </div>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Correo
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-coffee-700"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Número de tarjeta
        <input
          required
          inputMode="numeric"
          autoComplete="cc-number"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-coffee-700"
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Mes
          <input
            required
            inputMode="numeric"
            autoComplete="cc-exp-month"
            value={expMonth}
            onChange={(event) => setExpMonth(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-coffee-700"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Año
          <input
            required
            inputMode="numeric"
            autoComplete="cc-exp-year"
            value={expYear}
            onChange={(event) => setExpYear(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-coffee-700"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          CVV
          <input
            required
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvv}
            onChange={(event) => setCvv(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-coffee-700"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-coffee-50 p-3 text-sm text-coffee-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coffee-800 px-5 font-bold text-white hover:bg-coffee-900 disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {copy.cardPay}
      </button>
    </form>
  )
}
