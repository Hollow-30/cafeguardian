import { AuthForm } from "@/components/auth-form"

export const metadata = { title: "Crear cuenta | Café Guardián", description: "Crea tu cuenta de Café Guardián." }

export default function RegisterPage() {
  return <AuthForm mode="register" />
}
