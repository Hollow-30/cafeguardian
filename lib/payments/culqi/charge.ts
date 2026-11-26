import type { CulqiChargeResult } from "./types"

const CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"

/** Monto Premium en céntimos (S/12.00). */
export const CULQI_AMOUNT_CENTS = 1200

type CulqiChargeApiResponse = {
  id?: string
  amount?: number
  currency_code?: string
  outcome?: { type?: string; user_message?: string; merchant_message?: string }
  user_message?: string
  merchant_message?: string
  object?: string
}

export function getCulqiSecretKey(): string {
  const key = process.env.CULQI_SECRET_KEY?.trim()
  if (!key) throw new Error("Falta CULQI_SECRET_KEY.")
  return key
}

/**
 * Crea un cargo real en Culqi con la llave secreta (solo servidor).
 * amount se envía en céntimos.
 */
export async function createCulqiCharge(input: {
  tokenId: string
  email: string
  amountCents?: number
  description?: string
  metadata?: Record<string, string>
}): Promise<CulqiChargeResult> {
  const secret = getCulqiSecretKey()
  const amount = input.amountCents ?? CULQI_AMOUNT_CENTS
  const response = await fetch(CULQI_CHARGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency_code: "PEN",
      email: input.email,
      source_id: input.tokenId,
      description: input.description ?? "Café Guardián Premium",
      metadata: input.metadata,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as CulqiChargeApiResponse
  if (!response.ok || !payload.id) {
    const message =
      payload.user_message ||
      payload.merchant_message ||
      payload.outcome?.user_message ||
      "Culqi rechazó el cargo."
    throw new Error(message)
  }

  return {
    id: payload.id,
    amount: Math.round(amount / 100),
    currency: "PEN",
    outcome: "approved",
    message: payload.outcome?.user_message || payload.user_message || "Pago aceptado por Culqi.",
    tokenId: input.tokenId,
    simulated: false,
  }
}
