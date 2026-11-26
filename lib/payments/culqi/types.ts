export type CulqiCardInput = {
  cardNumber: string
  expMonth: string
  expYear: string
  cvv: string
  email: string
}

export type CulqiToken = {
  id: string
  /** true = token de simulador, no de Culqi real */
  simulated: boolean
  lastFour: string
}

export type CulqiChargeResult = {
  id: string
  amount: number
  currency: "PEN"
  outcome: "approved" | "declined"
  message: string
  tokenId: string
  simulated: boolean
}

export type CulqiCheckout = {
  mode: "simulated" | "live"
  createToken: (card: CulqiCardInput) => Promise<CulqiToken>
  /** Solo documentado; el cargo real lo hace el servidor. En simulación valida el token. */
  describe: () => string
}
