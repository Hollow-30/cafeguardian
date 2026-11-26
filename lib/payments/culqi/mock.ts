import type { CulqiCardInput, CulqiCheckout, CulqiToken } from "./types"

const LUHN_OK = /^(4242424242424242|4111111111111111)$/
const DECLINE = /^4000000000000002$/

function digitsOnly(value: string) {
  return value.replace(/\D/g, "")
}

function lastFour(cardNumber: string) {
  const digits = digitsOnly(cardNumber)
  return digits.slice(-4) || "0000"
}

/** Simula el SDK de Culqi: tokeniza en el cliente sin llaves reales. */
export function createCulqiSimulator(): CulqiCheckout {
  return {
    mode: "simulated",
    describe: () =>
      "Simulador Culqi (sin llaves). Usa 4242…4242 para aprobar o 4000…0002 para rechazar.",
    async createToken(card: CulqiCardInput): Promise<CulqiToken> {
      await new Promise((resolve) => setTimeout(resolve, 450))

      const number = digitsOnly(card.cardNumber)
      const month = Number(card.expMonth)
      const year = Number(card.expYear.length === 2 ? `20${card.expYear}` : card.expYear)
      const cvv = digitsOnly(card.cvv)

      if (!card.email.includes("@")) throw new Error("Correo inválido.")
      if (number.length < 15 || number.length > 16) throw new Error("Número de tarjeta inválido.")
      if (!Number.isFinite(month) || month < 1 || month > 12) throw new Error("Mes de vencimiento inválido.")
      if (!Number.isFinite(year) || year < new Date().getFullYear()) throw new Error("Año de vencimiento inválido.")
      if (cvv.length < 3 || cvv.length > 4) throw new Error("CVV inválido.")

      if (DECLINE.test(number)) {
        throw new Error("Tarjeta rechazada por el simulador (usa 4242…4242 para aprobar).")
      }
      if (!LUHN_OK.test(number) && !number.startsWith("4242")) {
        // Aceptamos cualquier 4242… para demos; otras se rechazan como “inválidas”.
        throw new Error("En el simulador usa 4242 4242 4242 4242.")
      }

      return {
        id: `tok_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        simulated: true,
        lastFour: lastFour(number),
      }
    },
  }
}
