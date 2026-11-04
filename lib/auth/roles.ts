export const ROLES = {
  CAFICULTOR: "caficultor",
  SUPERADMINISTRADOR: "superadministrador",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type AuthUserLike = {
  id?: string
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
