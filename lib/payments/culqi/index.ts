import { createCulqiSimulator } from "./mock"
import type { CulqiCheckout } from "./types"

/**
 * Hoy siempre usa el simulador.
 * Cuando existan CULQI_PUBLIC_KEY + secret, aquí se podrá devolver el SDK real.
 */
export function getCulqiCheckout(): CulqiCheckout {
  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
  if (publicKey && process.env.CULQI_SECRET_KEY) {
    // Reservado: integrar SDK real sin romper el contrato CulqiCheckout.
  }
  return createCulqiSimulator()
}

export type { CulqiCardInput, CulqiCheckout, CulqiToken, CulqiChargeResult } from "./types"
