import {
  type AuthUserLike,
  canAccessPanel,
  isPanelApiPath,
  isPanelPath,
  resolveRole,
} from "./roles"

export type PanelAccess =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string }

export type PanelGateDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string }
  | { action: "json"; status: number; body: Record<string, unknown> }

export function authorizePanelAccess(user: AuthUserLike): PanelAccess {
  if (!user) {
    return { ok: false, status: 401, error: "No autenticado" }
  }

  if (!canAccessPanel(resolveRole(user))) {
    return { ok: false, status: 403, error: "Acceso denegado" }
  }

  return { ok: true }
}

export function panelResumenPayload(overrides?: {
  caficultoresActivos?: number
  diagnosticosHoy?: number
  premiumActivos?: number
  gratisOSinPlan?: number
}) {
  return {
    ambito: "equipo" as const,
    titulo: "Resumen del panel",
    caficultoresActivos: overrides?.caficultoresActivos ?? 0,
    diagnosticosHoy: overrides?.diagnosticosHoy ?? 0,
    premiumActivos: overrides?.premiumActivos ?? 0,
    gratisOSinPlan: overrides?.gratisOSinPlan ?? 0,
  }
}

export function panelApiResponse(
  access: PanelAccess,
  resumen = panelResumenPayload(),
): {
  status: number
  body: Record<string, unknown>
} {
  if (!access.ok) {
    return { status: access.status, body: { error: access.error } }
  }

  return { status: 200, body: resumen }
}

export function panelGateDecision(input: {
  pathname: string
  user: AuthUserLike
}): PanelGateDecision {
  const isApi = isPanelApiPath(input.pathname)
  const isScreen = isPanelPath(input.pathname)

  if (!isApi && !isScreen) {
    return { action: "allow" }
  }

  const access = authorizePanelAccess(input.user)

  if (access.ok) {
    return { action: "allow" }
  }

  if (isApi) {
    return {
      action: "json",
      status: access.status,
      body: { error: access.error },
    }
  }

  return {
    action: "redirect",
    to: access.status === 401 ? "/login" : "/acceso-denegado",
  }
}
