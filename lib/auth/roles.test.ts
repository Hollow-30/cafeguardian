import { describe, expect, it } from "vitest"
import {
  ROLES,
  canAccessPanel,
  isAuthenticatedFeaturePath,
  isPanelApiPath,
  isPanelPath,
  postLoginPath,
  postLoginPathForRequest,
  resolveRole,
} from "./roles"
import {
  authorizePanelAccess,
  panelApiResponse,
  panelGateDecision,
  panelResumenPayload,
} from "./panel-access"

describe("roles", () => {
  it("defines Caficultor and Superadministrador", () => {
    expect(ROLES.CAFICULTOR).toBe("caficultor")
    expect(ROLES.SUPERADMINISTRADOR).toBe("superadministrador")
  })

  it("treats a missing user as Caficultor", () => {
    expect(resolveRole(null)).toBe("caficultor")
  })

  it("defaults to Caficultor when app_metadata has no role", () => {
    expect(resolveRole({ app_metadata: {} })).toBe("caficultor")
  })

  it("reads Superadministrador only from app_metadata", () => {
    expect(resolveRole({ app_metadata: { role: "superadministrador" } })).toBe("superadministrador")
  })

  it("ignores a Superadministrador role claimed in user_metadata", () => {
    expect(
      resolveRole({
        user_metadata: { role: "superadministrador" },
        app_metadata: {},
      }),
    ).toBe("caficultor")
  })

  it("does not let a public signup payload grant Superadministrador", () => {
    expect(
      resolveRole({
        app_metadata: {},
        user_metadata: { full_name: "Ana", role: "superadministrador" },
      }),
    ).toBe("caficultor")
  })
})

describe("panel access", () => {
  it("does not let a Caficultor open panel screens", () => {
    expect(canAccessPanel("caficultor")).toBe(false)
    expect(isPanelPath("/panel")).toBe(true)
    expect(isPanelPath("/panel/equipo")).toBe(true)
    expect(isPanelPath("/")).toBe(false)
  })

  it("lets a Superadministrador open panel screens", () => {
    expect(canAccessPanel("superadministrador")).toBe(true)
  })

  it("sends the Superadministrador to the panel after login", () => {
    expect(postLoginPath("superadministrador")).toBe("/panel")
  })

  it("keeps the Caficultor on the farmer home after login", () => {
    expect(postLoginPath("caficultor")).toBe("/")
  })

  it("allows local protected destinations after login", () => {
    expect(postLoginPathForRequest("caficultor", "/historial")).toBe("/historial")
    expect(postLoginPathForRequest("superadministrador", "/panel/equipo")).toBe("/panel/equipo")
  })

  it("rejects unsafe login destinations", () => {
    expect(postLoginPathForRequest("caficultor", "//example.com")).toBe("/")
    expect(postLoginPathForRequest("caficultor", "/\\example.com")).toBe("/")
    expect(postLoginPathForRequest("caficultor", "/panel")).toBe("/")
    expect(postLoginPathForRequest("caficultor", "/api/panel/resumen")).toBe("/")
    expect(postLoginPathForRequest("superadministrador", "/registro")).toBe("/panel")
  })

  it("identifies feature routes that require a session", () => {
    expect(isAuthenticatedFeaturePath("/diagnostico/nuevo")).toBe(true)
    expect(isAuthenticatedFeaturePath("/historial/123")).toBe(true)
    expect(isAuthenticatedFeaturePath("/planes/pagar")).toBe(true)
    expect(isAuthenticatedFeaturePath("/mis-pagos")).toBe(true)
    expect(isAuthenticatedFeaturePath("/account")).toBe(true)
    expect(isAuthenticatedFeaturePath("/contacto")).toBe(false)
    expect(isAuthenticatedFeaturePath("/login")).toBe(false)
    expect(isAuthenticatedFeaturePath("/")).toBe(false)
  })

  it("rejects unauthenticated panel API calls", () => {
    expect(authorizePanelAccess(null)).toEqual({
      ok: false,
      status: 401,
      error: "No autenticado",
    })
  })

  it("does not return panel data to a Caficultor", () => {
    const access = authorizePanelAccess({ app_metadata: { role: "caficultor" } })
    const response = panelApiResponse(access)

    expect(access).toEqual({ ok: false, status: 403, error: "Acceso denegado" })
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: "Acceso denegado" })
    expect(response.body).not.toHaveProperty("caficultoresActivos")
    expect(JSON.stringify(response.body)).not.toContain("equipo")
  })

  it("returns panel data only to a Superadministrador", () => {
    const access = authorizePanelAccess({
      app_metadata: { role: "superadministrador" },
    })
    const response = panelApiResponse(access)
    const data = panelResumenPayload()

    expect(access.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.body).toEqual(data)
    expect(response.body).toMatchObject({ ambito: "equipo" })
  })

  it("identifies panel API routes", () => {
    expect(isPanelApiPath("/api/panel/resumen")).toBe(true)
    expect(isPanelApiPath("/api/login")).toBe(false)
  })

  it("shows access denied when a Caficultor opens the panel", () => {
    expect(
      panelGateDecision({
        pathname: "/panel/equipo",
        user: { app_metadata: { role: "caficultor" } },
      }),
    ).toEqual({ action: "redirect", to: "/acceso-denegado" })
  })

  it("sends anonymous visitors of the panel to login", () => {
    expect(panelGateDecision({ pathname: "/panel", user: null })).toEqual({
      action: "redirect",
      to: "/login",
    })
  })

  it("returns access denied JSON when a Caficultor hits the panel API", () => {
    expect(
      panelGateDecision({
        pathname: "/api/panel/resumen",
        user: { app_metadata: { role: "caficultor" } },
      }),
    ).toEqual({
      action: "json",
      status: 403,
      body: { error: "Acceso denegado" },
    })
  })

  it("allows a Superadministrador through panel screens and API", () => {
    const user = { app_metadata: { role: "superadministrador" } }

    expect(panelGateDecision({ pathname: "/panel", user })).toEqual({ action: "allow" })
    expect(panelGateDecision({ pathname: "/api/panel/resumen", user })).toEqual({
      action: "allow",
    })
  })
})
