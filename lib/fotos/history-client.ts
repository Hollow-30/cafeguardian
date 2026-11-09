import type { FotoHistoryRecord } from "@/lib/fotos/history"

export async function fetchFotosHistorial(): Promise<FotoHistoryRecord[]> {
  const response = await fetch("/api/fotos", { credentials: "same-origin", cache: "no-store" })
  if (response.status === 401) {
    throw new Error("Inicia sesión para ver el historial en la nube.")
  }
  const payload = (await response.json().catch(() => ({}))) as {
    items?: FotoHistoryRecord[]
    error?: string
  }
  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo cargar el historial remoto.")
  }
  return payload.items ?? []
}

export async function fetchFotoHistorial(id: string): Promise<{
  item: FotoHistoryRecord
  content_url: string
}> {
  const response = await fetch(`/api/fotos/${id}`, { credentials: "same-origin", cache: "no-store" })
  if (response.status === 401) {
    throw new Error("Inicia sesión para ver este registro.")
  }
  if (response.status === 403 || response.status === 404) {
    throw new Error("Registro no encontrado.")
  }
  const payload = (await response.json().catch(() => ({}))) as {
    item?: FotoHistoryRecord
    content_url?: string
    error?: string
  }
  if (!response.ok || !payload.item) {
    throw new Error(payload.error ?? "No se pudo cargar el registro.")
  }
  return {
    item: payload.item,
    content_url: payload.content_url ?? `/api/fotos/${id}/archivo`,
  }
}

export async function deleteFotoHistorial(id: string): Promise<void> {
  const response = await fetch(`/api/fotos/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  })
  if (response.status === 401) {
    throw new Error("Inicia sesión para eliminar este registro.")
  }
  if (response.status === 404) return
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? "No se pudo eliminar el registro remoto.")
  }
}
