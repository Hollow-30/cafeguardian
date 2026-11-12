import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Elige la zona del catálogo (zonas_clima) del usuario con sesión.
// Escribe con la sesión del usuario (RLS), sin service role. Además de esta validación,
// el trigger profiles_zona_clima_activa de la migración rechaza zonas inactivas en la base.
export async function PATCH(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON." }, { status: 400 })
  }
  const zonaId = (cuerpo as { zona_clima_id?: unknown } | null)?.zona_clima_id
  if (typeof zonaId !== "string" || !UUID.test(zonaId)) {
    return NextResponse.json({ error: "Falta zona_clima_id (un id válido)." }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: zona, error: errorZona } = await supabase
    .from("zonas_clima")
    .select("id, nombre, activo")
    .eq("id", zonaId)
    .maybeSingle()
  if (errorZona) {
    return NextResponse.json({ error: "No se pudo verificar la zona." }, { status: 500 })
  }
  if (!zona || zona.activo !== true) {
    return NextResponse.json({ error: "Elige una zona disponible." }, { status: 422 })
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from("profiles")
    .update({ zona_clima_id: zona.id })
    .eq("id", user.id)
    .select("zona_clima_id")
    .maybeSingle()
  if (errorPerfil) {
    // 23514 = el trigger rechazó la zona (se desactivó justo ahora).
    if (errorPerfil.code === "23514") {
      return NextResponse.json({ error: "Elige una zona disponible." }, { status: 422 })
    }
    return NextResponse.json({ error: "No se pudo guardar la zona." }, { status: 500 })
  }
  if (!perfil) {
    return NextResponse.json({ error: "No se encontró tu perfil." }, { status: 404 })
  }

  return NextResponse.json({ zona_clima_id: zona.id, zona: { id: zona.id, nombre: zona.nombre } })
}
