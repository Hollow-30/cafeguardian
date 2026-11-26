"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { paymentContent as copy } from "@/content/payments"
import { hasCulqiPublicKey, openCulqiCheckout } from "@/lib/payments/culqi/sdk"

type Props = {
  label: string
  className?: string
  onPaid?: (message: string) => void
}

export function CulqiPayButton({ label, className, onPaid }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function chargeToken(tokenId: string, email?: string) {
    const response = await fetch("/api/pagos/culqi", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_id: tokenId,
        email: email ?? "",
      }),
    })
    const body = (await response.json().catch(() => ({}))) as {
      item?: unknown
      error?: string
      charge?: { message?: string }
    }
    if (!response.ok || !body.item) {
      throw new Error(body.error ?? "No se pudo completar el pago con Culqi.")
    }
    return body.charge?.message ?? copy.cardSuccess
  }

  async function handleClick() {
    if (loading) return
    setError("")

    if (!hasCulqiPublicKey()) {
      setError(
        "Faltan llaves Culqi. Agrega NEXT_PUBLIC_CULQI_PUBLIC_KEY y CULQI_SECRET_KEY en .env y reinicia el servidor.",
      )
      return
    }

    setLoading(true)
    try {
      const token = await openCulqiCheckout({ title: "Cafe Guardian Premium" })
      const message = await chargeToken(token.id, token.email)
      onPaid?.(message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el SDK oficial de Culqi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        className={
          className ??
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coffee-800 px-5 py-3 font-bold text-white hover:bg-coffee-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coffee-700 disabled:opacity-60"
        }
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {label}
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-coffee-50 p-3 text-sm text-coffee-800">
          {error}
        </p>
      )}
    </div>
  )
}
