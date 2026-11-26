import { NextResponse } from "next/server"
import { resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"
import { buildPlanEstado } from "@/lib/plans/estado"
import { ensurePruebaRegistro, expirePastDueSubscriptions } from "@/lib/plans/suscripciones"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  try {
    // Vence en bloque las activas caducadas (service role; el JWT del user no tiene UPDATE).
    try {
      const admin = createAdminClient()
      await expirePastDueSubscriptions(admin)
      // Respaldo si el trigger de registro no alcanzó a crear la prueba (p. ej. migración pendiente).
      if (resolveRole(user) === "caficultor") {
        await ensurePruebaRegistro(admin, user.id)
      }
    } catch {
      // Si falla el admin, igual se calcula el estado con el JWT del usuario.
    }

    const supabase = await createClient()
    const estado = await buildPlanEstado(supabase, user.id)
    return NextResponse.json(estado)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el plan." },
      { status: 500 },
    )
  }
}
