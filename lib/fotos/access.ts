import { type AuthUserLike, canAccessPanel, resolveRole } from "@/lib/auth/roles"

export type FotoUser = (AuthUserLike & { id?: string }) | null

export function canAccessFoto(input: {
  user: FotoUser
  fotoProfileId: string
}): boolean {
  if (!input.user?.id) {
    return false
  }

  if (input.user.id === input.fotoProfileId) {
    return true
  }

  return canAccessPanel(resolveRole(input.user))
}
