import type { Role } from "@/lib/auth/roles"
import { canAccessPanel } from "@/lib/auth/roles"

export function canAccessPago(input: {
  userId: string
  role: Role
  pagoProfileId: string
}): boolean {
  return input.pagoProfileId === input.userId || canAccessPanel(input.role)
}
