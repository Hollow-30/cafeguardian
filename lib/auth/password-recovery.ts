/** Solo rutas relativas internas (evita open redirect). */
export function safeAuthNextPath(path: string | null | undefined, fallback = "/nueva-contrasena"): string {
  if (!path) return fallback
  if (!path.startsWith("/") || path.startsWith("//")) return fallback
  return path
}

/** Destino del enlace de recuperación (debe estar en Redirect URLs de Supabase). */
export function passwordRecoveryRedirectTo(origin: string, next = "/nueva-contrasena"): string {
  const url = new URL("/auth/confirm", origin)
  url.searchParams.set("next", safeAuthNextPath(next))
  return url.toString()
}
