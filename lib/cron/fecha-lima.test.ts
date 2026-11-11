import { describe, expect, it } from "vitest"

import { fechaEnLima } from "./fecha-lima"

describe("fechaEnLima", () => {
  it("a las 04:59 UTC todavía es el día anterior en Lima", () => {
    expect(fechaEnLima(new Date("2026-11-11T04:59:00Z"))).toBe("2026-11-10")
  })

  it("a las 05:00 UTC ya es el día nuevo en Lima", () => {
    expect(fechaEnLima(new Date("2026-11-11T05:00:00Z"))).toBe("2026-11-11")
  })

  it("a las 11:00 UTC (hora del cron) es el mismo día", () => {
    expect(fechaEnLima(new Date("2026-11-11T11:00:00Z"))).toBe("2026-11-11")
  })
})
