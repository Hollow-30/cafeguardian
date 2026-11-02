import { ROLES } from "./roles.ts"

export function publicSignupUserMetadata(fullName: string) {
  return { full_name: fullName }
}

export function superadminAppMetadata() {
  return { role: ROLES.SUPERADMINISTRADOR }
}

export type SuperadminProvisionInput =
  | { mode: "create"; email: string; password: string }
  | { mode: "promote"; email: string }

export function readSuperadminProvisionInput(
  env: Record<string, string | undefined>,
): SuperadminProvisionInput {
  const email = env.SUPERADMIN_EMAIL?.trim()

  if (!email) {
    throw new Error("Define SUPERADMIN_EMAIL. El registro público no otorga Superadministrador.")
  }

  if (env.SUPERADMIN_PROMOTE === "1") {
    return { mode: "promote", email }
  }

  const password = env.SUPERADMIN_PASSWORD

  if (!password) {
    throw new Error("Define SUPERADMIN_PASSWORD en el entorno. Las contraseñas no van en el código.")
  }

  if (password.length < 6) {
    throw new Error("SUPERADMIN_PASSWORD debe tener al menos 6 caracteres.")
  }

  return { mode: "create", email, password }
}
