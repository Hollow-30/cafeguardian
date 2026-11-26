import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { AvisoSemaforo } from "@/components/aviso-semaforo"
import { LandingPage } from "@/components/landing-page"
import { FarmerHome } from "@/components/farmer-home"
import { postLoginPath, resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"
import { decidirAviso } from "@/lib/semaforo/aviso"
import { estadoSemaforo } from "@/lib/semaforo/estado"
import { leerSemaforo } from "@/lib/semaforo/leer"
import { createClient } from "@/lib/supabase/server"

// Aviso del semáforo para el inicio del caficultor. Si algo falla no se muestra nada:
// el inicio nunca se rompe por el semáforo. Lee con la sesión del usuario (RLS).
async function avisoDelSemaforo(userId: string | undefined): Promise<ReactNode> {
  if (!userId) return undefined
  try {
    const supabase = await createClient()
    const lectura = await leerSemaforo(supabase, userId)
    const ahora = new Date()
    const decision = decidirAviso({ estado: estadoSemaforo({ lectura, ahora }), ahora })
    return decision.tipo === "nada" ? undefined : <AvisoSemaforo decision={decision} />
  } catch {
    return undefined
  }
}

export default async function Page() {
  const user = await getAuthUser()

  if (!user) return <LandingPage />

  const role = resolveRole(user)
  if (role === "superadministrador") redirect(postLoginPath(role))

  const metadataName = user.user_metadata?.full_name
  const name = typeof metadataName === "string" ? metadataName : ""

  return <FarmerHome name={name} aviso={await avisoDelSemaforo(user.id)} />
}
