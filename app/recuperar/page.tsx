import { PasswordRecoverForm } from "@/components/password-recover-form"

export const metadata = {
  title: "Recuperar contraseña | Café Guardián",
  description: "Solicita un enlace para crear una nueva contraseña.",
}

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return <PasswordRecoverForm initialError={params.error ?? ""} />
}
