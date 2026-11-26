"use client"

import type { CulqiCardInput, CulqiCheckout, CulqiToken } from "./types"

const CULQI_TOKENS_URL = "https://secure.culqi.com/v2/tokens"

function digitsOnly(value: string) {
  return value.replace(/\D/g, "")
}

function normalizeYear(year: string) {
  return year.length === 2 ? `20${year}` : year
}

export function getCulqiPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY?.trim()
  if (!key) throw new Error("Falta NEXT_PUBLIC_CULQI_PUBLIC_KEY para Culqi.")
  return key
}

/**
 * Tokenización real vía API pública de Culqi (llave pk_* en el navegador).
 * No envía PAN a nuestros servidores.
 */
export function createCulqiBrowserCheckout(): CulqiCheckout {
  return {
    mode: "live",
    describe: () => "Culqi SDK (tokenización real con llave pública).",
    async createToken(card: CulqiCardInput): Promise<CulqiToken> {
      const publicKey = getCulqiPublicKey()
      const number = digitsOnly(card.cardNumber)
      const cvv = digitsOnly(card.cvv)
      const month = String(Number(card.expMonth)).padStart(2, "0")
      const year = normalizeYear(card.expYear)

      if (!card.email.includes("@")) throw new Error("Correo inválido.")
      if (number.length < 13 || number.length > 16) throw new Error("Número de tarjeta inválido.")
      if (Number(month) < 1 || Number(month) > 12) throw new Error("Mes de vencimiento inválido.")
      if (year.length !== 4) throw new Error("Año de vencimiento inválido.")
      if (cvv.length < 3 || cvv.length > 4) throw new Error("CVV inválido.")

      const response = await fetch(CULQI_TOKENS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_number: number,
          cvv,
          expiration_month: month,
          expiration_year: year,
          email: card.email.trim(),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        id?: string
        user_message?: string
        merchant_message?: string
        last_four?: string
      }

      if (!response.ok || !payload.id) {
        throw new Error(payload.user_message || payload.merchant_message || "No se pudo tokenizar la tarjeta con Culqi.")
      }

      return {
        id: payload.id,
        simulated: false,
        lastFour: payload.last_four || number.slice(-4),
      }
    },
  }
}
