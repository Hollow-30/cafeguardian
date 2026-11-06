import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { postLoginPath, resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"

export const metadata = { title: "Ingresar | Café Guardián", description: "Ingresa a tu panel de Café Guardián." }

export default async function LoginPage() {
  const user = await getAuthUser()
  if (user) redirect(postLoginPath(resolveRole(user)))

  return <AuthForm mode="login" />
}
