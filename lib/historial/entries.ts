import type { DiagnosisKey } from "@/content/diagnosis"
import type { FotoHistoryRecord } from "@/lib/fotos/history"
import type { StoredDiagnosis } from "@/lib/storage/diagnosesRepo"

export type HistoryEntry = {
  id: string
  label: DiagnosisKey
  confidence: number
  isDemo: boolean
  status: "offline" | "synced"
  createdAt: string
  lote: string
  note?: string
  imageUrl: string
  source: "remote" | "local"
  /** Id remoto en fotos (para DELETE /api/fotos/[id]). */
  remoteId: string | null
  blob?: Blob
}

function mapLabel(value: string | null | undefined): DiagnosisKey {
  if (value === "healthy" || value === "rust" || value === "inconclusive") return value
  if (value === "posible_roya" || value === "roya") return "rust"
  if (value === "sana") return "healthy"
  return "inconclusive"
}

/** Confianza DB 0–1 o UI 0–100 → porcentaje UI. */
export function confidenceToPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0
  return value <= 1 ? Math.round(value * 1000) / 10 : value
}

export function remoteFotoToEntry(foto: FotoHistoryRecord): HistoryEntry {
  return {
    id: foto.id,
    label: mapLabel(foto.resultado_etiqueta),
    confidence: confidenceToPercent(foto.confianza),
    isDemo: false,
    status: "synced",
    createdAt: foto.created_at,
    lote: foto.zona_etiqueta?.trim() || "",
    imageUrl: `/api/fotos/${foto.id}/archivo`,
    source: "remote",
    remoteId: foto.id,
  }
}

export function localDiagnosisToEntry(diagnosis: StoredDiagnosis): HistoryEntry {
  return {
    id: diagnosis.id,
    label: diagnosis.label,
    confidence: confidenceToPercent(diagnosis.confidence),
    isDemo: diagnosis.isDemo === true,
    status: diagnosis.status,
    createdAt: diagnosis.createdAt,
    lote: diagnosis.lote,
    note: diagnosis.note,
    imageUrl: "",
    source: "local",
    remoteId: diagnosis.status === "synced" ? diagnosis.photoId : null,
    blob: diagnosis.blob,
  }
}

/**
 * Remotos primero; locales offline que no estén ya cubiertos por remoteId/photoId.
 * Si un local synced coincide con remoto, gana el remoto (imagen de API).
 */
export function mergeHistoryEntries(remote: HistoryEntry[], local: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>()
  const coveredRemote = new Set<string>()

  for (const item of remote) {
    byId.set(item.id, item)
    coveredRemote.add(item.id)
  }

  for (const item of local) {
    if (item.remoteId && coveredRemote.has(item.remoteId)) {
      const remoteItem = byId.get(item.remoteId)
      if (remoteItem && item.note) {
        byId.set(item.remoteId, { ...remoteItem, note: item.note })
      }
      continue
    }
    if (item.status === "synced" && item.remoteId && byId.has(item.remoteId)) continue
    byId.set(item.id, item)
  }

  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
