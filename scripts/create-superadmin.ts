import { createClient } from "@supabase/supabase-js"
import { readSuperadminProvisionInput, superadminAppMetadata } from "../lib/auth/superadmin-provision.ts"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.")
}

const input = readSuperadminProvisionInput(process.env)
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

if (input.mode === "promote") {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) {
    throw new Error(error.message)
  }

  const user = data.users.find((item) => item.email === input.email)
  if (!user) {
    throw new Error(`No existe una cuenta con el correo ${input.email}.`)
  }

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, ...superadminAppMetadata() },
  })
  if (updateError) {
    throw new Error(updateError.message)
  }

  console.log(`Promovido a Superadministrador: ${updated.user.email}`)
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: superadminAppMetadata(),
    user_metadata: { full_name: "Superadministrador" },
  })
  if (error) {
    throw new Error(error.message)
  }

  console.log(`Superadministrador creado: ${data.user.email}`)
}
