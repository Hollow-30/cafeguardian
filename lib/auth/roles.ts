export const ROLES = {
  CAFICULTOR: "caficultor",
  SUPERADMINISTRADOR: "superadministrador",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type AuthUserLike = {
  id?: string
  email?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
} | null

export function resolveRole(user: AuthUserLike): Role {
  const role = user?.app_metadata?.role
  if (role === ROLES.SUPERADMINISTRADOR) {
    return ROLES.SUPERADMINISTRADOR
  }
  return ROLES.CAFICULTOR
}

export function canAccessPanel(role: Role): boolean {
  return role === ROLES.SUPERADMINISTRADOR
}

export function postLoginPath(role: Role): string {
  return canAccessPanel(role) ? "/panel" : "/"
}

export function isPanelPath(pathname: string): boolean {
  return pathname === "/panel" || pathname.startsWith("/panel/")
}

export function isPanelApiPath(pathname: string): boolean {
  return pathname === "/api/panel" || pathname.startsWith("/api/panel/")
}

export function isAuthenticatedFeaturePath(pathname: string): boolean {
  return (
    pathname === "/diagnostico" ||
    pathname.startsWith("/diagnostico/") ||
    pathname === "/historial" ||
    pathname.startsWith("/historial/") ||
    pathname === "/planes" ||
    pathname.startsWith("/planes/") ||
    pathname === "/mis-pagos" ||
    pathname === "/account"
  )
}

export function postLoginPathForRequest(role: Role, requestedPath: string | null): string {
  if (!requestedPath) return postLoginPath(role)

  let destination: URL
  try {
    destination = new URL(requestedPath, "https://cafeguardian.invalid")
  } catch {
    return postLoginPath(role)
  }

  if (destination.origin !== "https://cafeguardian.invalid") return postLoginPath(role)

  const { pathname, search, hash } = destination
  if (
    pathname === "/login" ||
    pathname === "/registro" ||
    (role !== ROLES.SUPERADMINISTRADOR && (isPanelPath(pathname) || isPanelApiPath(pathname)))
  ) {
    return postLoginPath(role)
  }

  return `${pathname}${search}${hash}`
}
