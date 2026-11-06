import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { postLoginPath, resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"

export const metadata = { title: "Crear cuenta | Café Guardián", description: "Crea tu cuenta de Café Guardián." }

export default async function RegisterPage() {
  const user = await getAuthUser()
  if (user) redirect(postLoginPath(resolveRole(user)))

  return <AuthForm mode="register" />
}
