/** Solo rutas relativas internas (evita open redirect). */
export function safeAuthNextPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback
  if (!path.startsWith("/") || path.startsWith("//")) return fallback
  return path
}

/** Destino común de enlaces de correo (confirmación / recuperación). Debe estar en Redirect URLs de Supabase. */
export function authEmailRedirectTo(origin: string, next = "/"): string {
  const url = new URL("/auth/confirm", origin)
  url.searchParams.set("next", safeAuthNextPath(next, "/"))
  return url.toString()
}

/** Destino del enlace de recuperación. */
export function passwordRecoveryRedirectTo(origin: string, next = "/nueva-contrasena"): string {
  return authEmailRedirectTo(origin, safeAuthNextPath(next, "/nueva-contrasena"))
}

/** Página de error según el tipo de enlace de correo. */
export function authConfirmFailPath(input: {
  type?: string | null
  next?: string | null
}): string {
  const next = input.next ?? ""
  if (input.type === "recovery" || next.includes("nueva-contrasena")) {
    return "/recuperar?error=enlace"
  }
  return "/login?error=confirmacion"
}
