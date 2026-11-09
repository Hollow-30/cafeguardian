import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { canAccessFoto } from "@/lib/fotos/access"
import { ensureZonaForUser } from "@/lib/fotos/ensure-zona"
import { buildFotoHistoryRecord } from "@/lib/fotos/history"
import { buildFotoObjectKey } from "@/lib/fotos/object-key"
import { assertFotoUpload } from "@/lib/fotos/validation"
import { getAuthUser } from "@/lib/auth/session"
import { resolveRole, canAccessPanel } from "@/lib/auth/roles"
import { uploadFotoObject } from "@/lib/r2/client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const supabase = await createClient()
  const url = new URL(request.url)
  const profileId = url.searchParams.get("profile_id")
  const isAdmin = canAccessPanel(resolveRole(user))

  let query = supabase
    .from("fotos")
    .select(
      "id, profile_id, zona_id, storage_path, content_type, byte_size, created_at, resultado_etiqueta, confianza, semaforo_dia, semaforo_fecha, estado, zonas(etiqueta)",
    )
    .order("created_at", { ascending: false })

  if (isAdmin && profileId) {
    query = query.eq("profile_id", profileId)
  } else if (!isAdmin) {
    query = query.eq("profile_id", user.id)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = (data ?? []).map((row) => {
    const zona = Array.isArray(row.zonas) ? row.zonas[0] : row.zonas
    return buildFotoHistoryRecord({
      id: row.id,
      profileId: row.profile_id,
      zonaId: row.zona_id,
      storagePath: row.storage_path,
      contentType: row.content_type ?? "application/octet-stream",
      byteSize: row.byte_size ?? 0,
      createdAt: row.created_at,
      resultadoEtiqueta: row.resultado_etiqueta,
      confianza: row.confianza === null || row.confianza === undefined ? null : Number(row.confianza),
      semaforoDia: row.semaforo_dia,
      semaforoFecha: row.semaforo_fecha,
      zonaEtiqueta: zona?.etiqueta ?? null,
    })
  })

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file")
  const zonaId = String(form.get("zona_id") ?? "")
  const zonaEtiqueta = String(form.get("zona_etiqueta") ?? "")
  const consentimientoAnonimo = String(form.get("consentimiento_anonimo") ?? "") === "true"
  const resultadoEtiqueta = String(form.get("resultado_etiqueta") ?? "") || null
  const confianza = parseOptionalNumber(form.get("confianza"))
  const semaforoDia = String(form.get("semaforo_dia") ?? "") || null
  const semaforoFecha = String(form.get("semaforo_fecha") ?? "") || null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de la foto." }, { status: 400 })
  }

  if (!zonaId && !zonaEtiqueta.trim()) {
    return NextResponse.json({ error: "Falta zona_id o zona_etiqueta." }, { status: 400 })
  }

  try {
    assertFotoUpload({ byteSize: file.size, contentType: file.type })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archivo inválido" },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  let zona: { id: string; profile_id: string; etiqueta: string } | null = null

  if (zonaId) {
    const { data, error: zonaError } = await supabase
      .from("zonas")
      .select("id, profile_id, etiqueta")
      .eq("id", zonaId)
      .maybeSingle()

    if (zonaError) {
      return NextResponse.json({ error: zonaError.message }, { status: 500 })
    }
    zona = data
  } else {
    try {
      const ensured = await ensureZonaForUser(supabase as never, user.id, zonaEtiqueta)
      zona = { id: ensured.id, profile_id: user.id, etiqueta: ensured.etiqueta }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No se pudo resolver la zona." },
        { status: 500 },
      )
    }
  }

  if (!zona || !canAccessFoto({ user, fotoProfileId: zona.profile_id }) || zona.profile_id !== user.id) {
    return NextResponse.json({ error: "Acceso denegado a la zona." }, { status: 403 })
  }

  const fotoId = randomUUID()
  const storagePath = buildFotoObjectKey({
    fotoId,
    contentType: file.type,
    profileId: user.id,
  })
  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    await uploadFotoObject({
      key: storagePath,
      body: bytes,
      contentType: file.type,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir a R2" },
      { status: 502 },
    )
  }

  const estado = resultadoEtiqueta ? "procesada" : "pendiente"
  const { data: foto, error: insertError } = await supabase
    .from("fotos")
    .insert({
      id: fotoId,
      zona_id: zonaId,
      profile_id: user.id,
      storage_path: storagePath,
      content_type: file.type,
      byte_size: file.size,
      consentimiento_anonimo: consentimientoAnonimo,
      estado,
      resultado_etiqueta: resultadoEtiqueta,
      confianza,
      semaforo_dia: semaforoDia,
      semaforo_fecha: semaforoFecha || null,
    })
    .select(
      "id, profile_id, zona_id, storage_path, content_type, byte_size, created_at, resultado_etiqueta, confianza, semaforo_dia, semaforo_fecha",
    )
    .single()

  if (insertError || !foto) {
    return NextResponse.json({ error: insertError?.message ?? "No se guardó el registro" }, { status: 500 })
  }

  if (resultadoEtiqueta) {
    await supabase.from("resultados").insert({
      foto_id: foto.id,
      profile_id: user.id,
      tipo: "diagnostico",
      etiqueta: resultadoEtiqueta,
      confianza,
      detalle: { fuente: "upload" },
    })
  }

  if (semaforoDia) {
    await supabase.from("resultados").insert({
      foto_id: foto.id,
      profile_id: user.id,
      tipo: "semaforo",
      etiqueta: semaforoDia,
      confianza: null,
      detalle: { fecha: semaforoFecha, fuente: "upload" },
    })
  }

  await supabase.from("eventos").insert({
    profile_id: user.id,
    tipo: "foto_subida",
    entidad: "fotos",
    entidad_id: foto.id,
    metadata: { storage_path: storagePath, byte_size: file.size },
  })

  return NextResponse.json(
    {
      item: buildFotoHistoryRecord({
        id: foto.id,
        profileId: foto.profile_id,
        zonaId: foto.zona_id,
        storagePath: foto.storage_path,
        contentType: foto.content_type ?? file.type,
        byteSize: foto.byte_size ?? file.size,
        createdAt: foto.created_at,
        resultadoEtiqueta: foto.resultado_etiqueta,
        confianza: foto.confianza === null || foto.confianza === undefined ? null : Number(foto.confianza),
        semaforoDia: foto.semaforo_dia,
        semaforoFecha: foto.semaforo_fecha,
        zonaEtiqueta: zona.etiqueta,
      }),
    },
    { status: 201 },
  )
}
