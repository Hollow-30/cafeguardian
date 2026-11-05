import { freePhotoQuota, trialDays } from "@/content/pricing"

export type PlanId = "free" | "premium"

export interface PlanUser {
  plan: PlanId
  trialStartedAt?: string | Date | null
  premiumUntil?: string | Date | null
  photosUsedThisMonth: number
}

export interface PlanStatus {
  plan: PlanId
  isTrial: boolean
  trialDaysRemaining: number
  premiumActive: boolean
}

const toTime = (value: string | Date) => new Date(value).getTime()

export function getPlanStatus(user: PlanUser, now: Date = new Date()): PlanStatus {
  const trialElapsed = user.trialStartedAt ? Math.floor((now.getTime() - toTime(user.trialStartedAt)) / 86_400_000) : trialDays
  const isTrial = user.plan === "premium" && trialElapsed >= 0 && trialElapsed < trialDays && !user.premiumUntil
  const premiumActive = user.plan === "premium" && (isTrial || Boolean(user.premiumUntil && toTime(user.premiumUntil) > now.getTime()))

  return {
    plan: premiumActive ? "premium" : "free",
    isTrial,
    trialDaysRemaining: isTrial ? Math.max(0, trialDays - trialElapsed) : 0,
    premiumActive,
  }
}

export function photosRemaining(user: PlanUser): number | null {
  if (user.plan === "premium") return null
  return Math.max(0, freePhotoQuota - user.photosUsedThisMonth)
}
