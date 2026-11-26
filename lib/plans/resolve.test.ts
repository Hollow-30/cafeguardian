import { describe, expect, it } from "vitest"
import { pickActiveSubscription, planUserFromSubscription, startOfMonthLima, todayLima } from "./resolve"

describe("planUserFromSubscription", () => {
  const now = new Date("2026-11-17T18:00:00.000Z")

  it("sin suscripción → gratis con fotos del mes", () => {
    expect(planUserFromSubscription(null, 3, now)).toEqual({
      plan: "free",
      photosUsedThisMonth: 3,
    })
  })

  it("prueba_30 activa → premium trial", () => {
    const user = planUserFromSubscription(
      {
        estado: "activa",
        inicia_en: "2026-11-01",
        termina_en: "2026-12-01",
        plan_codigo: "prueba_30",
      },
      2,
      now,
    )
    expect(user.plan).toBe("premium")
    expect(user.trialStartedAt).toBe("2026-11-01T12:00:00.000Z")
    expect(user.premiumUntil).toBeNull()
    expect(user.photosUsedThisMonth).toBe(2)
  })

  it("plan anual activo → premiumUntil", () => {
    const user = planUserFromSubscription(
      {
        estado: "activa",
        inicia_en: "2026-01-01",
        termina_en: "2026-12-31",
        plan_codigo: "basico_anual",
      },
      0,
      now,
    )
    expect(user.plan).toBe("premium")
    expect(user.premiumUntil).toBe("2026-12-31T23:59:59.999Z")
  })

  it("suscripción vencida por fecha → gratis", () => {
    expect(
      planUserFromSubscription(
        {
          estado: "activa",
          inicia_en: "2026-01-01",
          termina_en: "2026-11-01",
          plan_codigo: "prueba_30",
        },
        1,
        now,
      ).plan,
    ).toBe("free")
  })
})

describe("pickActiveSubscription", () => {
  it("elige la activa con termina_en más lejana", () => {
    const picked = pickActiveSubscription(
      [
        {
          estado: "activa",
          inicia_en: "2026-01-01",
          termina_en: "2026-11-20",
          plan_codigo: "prueba_30",
        },
        {
          estado: "activa",
          inicia_en: "2026-01-01",
          termina_en: "2026-12-31",
          plan_codigo: "basico_anual",
        },
        {
          estado: "vencida",
          inicia_en: "2025-01-01",
          termina_en: "2025-12-31",
          plan_codigo: "basico_anual",
        },
      ],
      new Date("2026-11-17T18:00:00.000Z"),
    )
    expect(picked?.plan_codigo).toBe("basico_anual")
  })
})

describe("fechas Lima", () => {
  it("todayLima y startOfMonthLima son estables", () => {
    const now = new Date("2026-11-17T18:00:00.000Z")
    expect(todayLima(now)).toBe("2026-11-17")
    expect(startOfMonthLima(now)).toBe("2026-11-01T05:00:00.000Z")
  })
})
