import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { buildPlanEstado } from "@/lib/plans/estado"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  try {
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
