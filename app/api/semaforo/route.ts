import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { leerSemaforo } from "@/lib/semaforo/leer"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const supabase = await createClient()
  const lectura = await leerSemaforo(supabase, user.id)
  if (lectura.error) {
    return NextResponse.json({ error: "No se pudo leer el semáforo." }, { status: 500 })
  }

  return NextResponse.json({
    zona: lectura.zona,
    riesgo: lectura.riesgo,
  })
}
