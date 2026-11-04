import { NextResponse } from "next/server"
import { canAccessFoto } from "@/lib/fotos/access"
import { getAuthUser } from "@/lib/auth/session"
import { getFotoObject } from "@/lib/r2/client"
import { createClient } from "@/lib/supabase/server"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: foto, error } = await supabase
    .from("fotos")
    .select("id, profile_id, storage_path, content_type")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!foto || !canAccessFoto({ user, fotoProfileId: foto.profile_id })) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    const object = await getFotoObject(foto.storage_path)
    return new NextResponse(object.body, {
      status: 200,
      headers: {
        "Content-Type": foto.content_type || object.contentType,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (readError) {
    return NextResponse.json(
      { error: readError instanceof Error ? readError.message : "Error al leer R2" },
      { status: 502 },
    )
  }
}
