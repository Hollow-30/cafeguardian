/** Catálogo de planes Culqi (recurrentes). Se crean con `pnpm culqi:plans`. */

export type CulqiPlanDefinition = {
  codigo: string
  name: string
  shortName: string
  description: string
  /** Monto en céntimos */
  amountCents: number
  currency: "PEN"
  /** 1 diario · 2 semanal · 3 mensual · 4 anual */
  intervalUnitTime: 1 | 2 | 3 | 4 | 5 | 6
  intervalCount: number
  /** Días de cobertura en nuestra DB al activar */
  diasDuracion: number
}

export const CULQI_PLANS: CulqiPlanDefinition[] = [
  {
    codigo: "premium_mensual",
    name: "Café Guardián Premium",
    shortName: "cg-premium-mensual",
    description: "Fotos ilimitadas y historial por parcela. Cobro mensual.",
    amountCents: 1200,
    currency: "PEN",
    intervalUnitTime: 3,
    intervalCount: 1,
    diasDuracion: 30,
  },
]

export function getCulqiPlanPremiumId(): string | null {
  return process.env.CULQI_PLAN_PREMIUM_ID?.trim() || null
}
