import { redirect } from "next/navigation"
import { AccountSettings } from "@/components/account-settings"
import { getAuthUser } from "@/lib/auth/session"

export const metadata = {
  title: "Mi cuenta | Café Guardián",
  description: "Administra tus datos de cuenta y suscripción de Café Guardián.",
}

export default async function AccountPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const metadataName = user.user_metadata?.full_name
  const metadataAvatar = user.user_metadata?.avatar_url

  return (
    <AccountSettings
      email={user.email ?? ""}
      name={typeof metadataName === "string" ? metadataName : ""}
      avatarUrl={typeof metadataAvatar === "string" ? metadataAvatar : ""}
    />
  )
}
