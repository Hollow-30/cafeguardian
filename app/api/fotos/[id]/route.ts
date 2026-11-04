import { NextResponse } from "next/server"
import { canAccessFoto } from "@/lib/fotos/access"
import { buildFotoHistoryRecord } from "@/lib/fotos/history"
import { getAuthUser } from "@/lib/auth/session"
import { deleteFotoObject } from "@/lib/r2/client"
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
    .select(
      "id, profile_id, zona_id, storage_path, content_type, byte_size, created_at, resultado_etiqueta, confianza, semaforo_dia, semaforo_fecha, zonas(etiqueta)",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!foto || !canAccessFoto({ user, fotoProfileId: foto.profile_id })) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const zona = Array.isArray(foto.zonas) ? foto.zonas[0] : foto.zonas

  return NextResponse.json({
    item: buildFotoHistoryRecord({
      id: foto.id,
      profileId: foto.profile_id,
      zonaId: foto.zona_id,
      storagePath: foto.storage_path,
      contentType: foto.content_type ?? "application/octet-stream",
      byteSize: foto.byte_size ?? 0,
      createdAt: foto.created_at,
      resultadoEtiqueta: foto.resultado_etiqueta,
      confianza: foto.confianza === null || foto.confianza === undefined ? null : Number(foto.confianza),
      semaforoDia: foto.semaforo_dia,
      semaforoFecha: foto.semaforo_fecha,
      zonaEtiqueta: zona?.etiqueta ?? null,
    }),
    content_url: `/api/fotos/${foto.id}/archivo`,
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: foto, error } = await supabase
    .from("fotos")
    .select("id, profile_id, storage_path")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!foto || !canAccessFoto({ user, fotoProfileId: foto.profile_id })) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    await deleteFotoObject(foto.storage_path)
  } catch (deleteError) {
    return NextResponse.json(
      { error: deleteError instanceof Error ? deleteError.message : "Error al borrar en R2" },
      { status: 502 },
    )
  }

  const { error: dbError } = await supabase.from("fotos").delete().eq("id", foto.id)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await supabase.from("eventos").insert({
    profile_id: user.id,
    tipo: "foto_eliminada",
    entidad: "fotos",
    entidad_id: foto.id,
    metadata: { storage_path: foto.storage_path },
  })

  return NextResponse.json({ ok: true })
}
