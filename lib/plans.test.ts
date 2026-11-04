import { describe, expect, it } from "vitest"
import { getPlanStatus, photosRemaining, type PlanUser } from "./plans"

const start = new Date("2026-01-01T12:00:00Z")
const user: PlanUser = { plan: "premium", trialStartedAt: start, photosUsedThisMonth: 0 }

describe("getPlanStatus", () => {
  it("mantiene la prueba en el día 29", () => expect(getPlanStatus(user, new Date("2026-01-30T12:00:00Z")).isTrial).toBe(true))
  it("termina la prueba en el día 30", () => expect(getPlanStatus(user, new Date("2026-01-31T12:00:00Z")).plan).toBe("free"))
  it("sigue vencida en el día 31", () => expect(getPlanStatus(user, new Date("2026-02-01T12:00:00Z")).premiumActive).toBe(false))
})

describe("photosRemaining", () => {
  it("devuelve cero si el usuario gratis agotó la cuota", () => expect(photosRemaining({ plan: "free", photosUsedThisMonth: 10 })).toBe(0))
  it("no limita las fotos Premium", () => expect(photosRemaining({ plan: "premium", photosUsedThisMonth: 30 })).toBeNull())
})
