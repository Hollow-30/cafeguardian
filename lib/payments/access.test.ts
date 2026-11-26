import { describe, expect, it } from "vitest"
import { canAccessPago } from "./access"

describe("canAccessPago", () => {
  it("permite dueño o superadmin", () => {
    expect(canAccessPago({ userId: "u1", role: "caficultor", pagoProfileId: "u1" })).toBe(true)
    expect(canAccessPago({ userId: "admin", role: "superadministrador", pagoProfileId: "u1" })).toBe(true)
    expect(canAccessPago({ userId: "u2", role: "caficultor", pagoProfileId: "u1" })).toBe(false)
  })
})
