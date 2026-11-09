import type { FotoHistoryRecord } from "@/lib/fotos/history"

export type UploadFotoRegistroInput = {
  blob: Blob
  lote?: string
  resultadoEtiqueta?: string | null
  confianza?: number | null
  consentimientoAnonimo?: boolean
}

function extensionFor(type: string) {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  return "jpg"
}

/** Sube la foto al historial remoto (R2 + Supabase) vía POST /api/fotos. */
export async function uploadFotoRegistro(input: UploadFotoRegistroInput): Promise<FotoHistoryRecord> {
  const type = input.blob.type || "image/jpeg"
  const form = new FormData()
  form.append("file", input.blob, `foto.${extensionFor(type)}`)
  form.append("zona_etiqueta", input.lote?.trim() || "Sin lote")
  if (input.consentimientoAnonimo) form.append("consentimiento_anonimo", "true")
  if (input.resultadoEtiqueta) form.append("resultado_etiqueta", input.resultadoEtiqueta)
  if (input.confianza != null && Number.isFinite(input.confianza)) {
    form.append("confianza", String(input.confianza))
  }

  let response: Response
  try {
    response = await fetch("/api/fotos", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      cache: "no-store",
    })
  } catch {
    throw new Error("No se pudo conectar para guardar la foto. Revisa tu conexión.")
  }

  if (response.status === 401) {
    throw new Error("Inicia sesión para guardar el registro de la foto.")
  }

  const payload = (await response.json().catch(() => ({}))) as {
    item?: FotoHistoryRecord
    error?: string
  }

  if (!response.ok || !payload.item) {
    throw new Error(payload.error ?? "No se pudo guardar el registro de la foto.")
  }

  return payload.item
}
