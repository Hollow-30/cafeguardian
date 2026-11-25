import { describe, expect, it } from "vitest"
import {
  authConfirmFailPath,
  authEmailRedirectTo,
  passwordRecoveryRedirectTo,
  safeAuthNextPath,
} from "./password-recovery"

describe("safeAuthNextPath", () => {
  it("acepta rutas internas y rechaza externas", () => {
    expect(safeAuthNextPath("/nueva-contrasena")).toBe("/nueva-contrasena")
    expect(safeAuthNextPath("//evil.com")).toBe("/")
    expect(safeAuthNextPath("https://evil.com")).toBe("/")
    expect(safeAuthNextPath(null, "/recuperar")).toBe("/recuperar")
  })
})

describe("authEmailRedirectTo", () => {
  it("apunta al confirm con next del alta", () => {
    expect(authEmailRedirectTo("http://localhost:3000", "/")).toBe(
      "http://localhost:3000/auth/confirm?next=%2F",
    )
  })
})

describe("passwordRecoveryRedirectTo", () => {
  it("apunta al confirm con next seguro", () => {
    expect(passwordRecoveryRedirectTo("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/confirm?next=%2Fnueva-contrasena",
    )
  })
})

describe("authConfirmFailPath", () => {
  it("manda recuperación a /recuperar y el alta a /login", () => {
    expect(authConfirmFailPath({ type: "recovery" })).toBe("/recuperar?error=enlace")
    expect(authConfirmFailPath({ type: "signup" })).toBe("/login?error=confirmacion")
    expect(authConfirmFailPath({ next: "/nueva-contrasena" })).toBe("/recuperar?error=enlace")
  })
})
