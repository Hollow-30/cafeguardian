import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/** Actualiza el perfil público (nombre) usado por el panel. */
export async function PATCH(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  let body: { full_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : ""
  if (!fullName) {
    return NextResponse.json({ error: "Indica tu nombre." }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id, full_name")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo actualizar el perfil." }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
