import { AuthForm } from "@/components/auth-form"

export const metadata = { title: "Ingresar | Café Guardián", description: "Ingresa a tu panel de Café Guardián." }

export default function LoginPage() {
  return <AuthForm mode="login" />
}
