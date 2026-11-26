import { createCulqiSimulator } from "./mock"
import type { CulqiCheckout } from "./types"

/**
 * Servidor / tests: con llaves → modo live (el cargo real va en charge.ts).
 * Sin llaves → simulador solo para desarrollo local.
 * En el navegador usa createCulqiBrowserCheckout() desde components.
 */
export function getCulqiCheckout(): CulqiCheckout {
  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
  const secretKey = process.env.CULQI_SECRET_KEY
  if (publicKey && secretKey) {
    return {
      mode: "live",
      describe: () => "Culqi configurado (llaves presentes). Tokeniza en cliente y cobra en servidor.",
      async createToken() {
        throw new Error("En el servidor no se tokeniza. Usa createCulqiBrowserCheckout en el cliente.")
      },
    }
  }
  return createCulqiSimulator()
}

export { createCulqiCharge, CULQI_AMOUNT_CENTS, getCulqiSecretKey } from "./charge"
export type { CulqiCardInput, CulqiCheckout, CulqiToken, CulqiChargeResult } from "./types"
