import { redirect } from "next/navigation"
import { FarmerHome } from "@/components/farmer-home"
import { postLoginPath, resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"

export default async function Page() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  const role = resolveRole(user)
  if (role === "superadministrador") redirect(postLoginPath(role))

  const metadataName = user.user_metadata?.full_name
  const name = typeof metadataName === "string" ? metadataName : ""

  return <FarmerHome name={name} />
}
