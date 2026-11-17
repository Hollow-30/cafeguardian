import type { PlanId, PlanUser } from "@/lib/plans"

export type SubscriptionRow = {
  estado: string
  inicia_en: string
  termina_en: string
  plan_codigo: string | null
}

/** Inicio del mes calendario en America/Lima (ISO UTC). */
export function startOfMonthLima(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  // Medianoche Lima = 05:00 UTC (sin DST en Perú).
  return `${year}-${month}-01T05:00:00.000Z`
}

export function todayLima(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/**
 * Mapea la suscripción más relevante a PlanUser.
 * - prueba_30 activa → Premium en trial (sin premiumUntil)
 * - otro plan activo → Premium hasta termina_en
 * - sin activa / vencida → Gratis
 */
export function planUserFromSubscription(
  sub: SubscriptionRow | null,
  photosUsedThisMonth: number,
  now: Date = new Date(),
): PlanUser {
  const today = todayLima(now)
  if (!sub || sub.estado !== "activa" || sub.termina_en < today) {
    return { plan: "free", photosUsedThisMonth }
  }

  const plan: PlanId = "premium"
  if (sub.plan_codigo === "prueba_30") {
    return {
      plan,
      trialStartedAt: `${sub.inicia_en}T12:00:00.000Z`,
      premiumUntil: null,
      photosUsedThisMonth,
    }
  }

  return {
    plan,
    trialStartedAt: null,
    premiumUntil: `${sub.termina_en}T23:59:59.999Z`,
    photosUsedThisMonth,
  }
}

export function pickActiveSubscription(rows: SubscriptionRow[], now: Date = new Date()): SubscriptionRow | null {
  const today = todayLima(now)
  const activas = rows.filter((row) => row.estado === "activa" && row.termina_en >= today)
  if (activas.length === 0) return null
  return [...activas].sort((a, b) => b.termina_en.localeCompare(a.termina_en))[0]
}
