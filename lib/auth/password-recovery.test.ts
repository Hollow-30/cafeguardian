import { describe, expect, it } from "vitest"
import { passwordRecoveryRedirectTo, safeAuthNextPath } from "./password-recovery"

describe("safeAuthNextPath", () => {
  it("acepta rutas internas y rechaza externas", () => {
    expect(safeAuthNextPath("/nueva-contrasena")).toBe("/nueva-contrasena")
    expect(safeAuthNextPath("//evil.com")).toBe("/nueva-contrasena")
    expect(safeAuthNextPath("https://evil.com")).toBe("/nueva-contrasena")
    expect(safeAuthNextPath(null, "/recuperar")).toBe("/recuperar")
  })
})

describe("passwordRecoveryRedirectTo", () => {
  it("apunta al confirm con next seguro", () => {
    expect(passwordRecoveryRedirectTo("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/confirm?next=%2Fnueva-contrasena",
    )
  })
})
