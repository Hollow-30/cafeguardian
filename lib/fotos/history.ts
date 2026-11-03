export type FotoHistoryInput = {
  id: string
  profileId: string
  zonaId: string
  storagePath: string
  contentType: string
  byteSize: number
  createdAt: string
  resultadoEtiqueta: string | null
  confianza: number | null
  semaforoDia: string | null
  semaforoFecha: string | null
  zonaEtiqueta?: string | null
}

export type FotoHistoryRecord = {
  id: string
  profile_id: string
  zona_id: string
  storage_path: string
  content_type: string
  byte_size: number
  created_at: string
  resultado_etiqueta: string | null
  confianza: number | null
  semaforo_dia: string | null
  semaforo_fecha: string | null
  zona_etiqueta?: string | null
}

export function buildFotoHistoryRecord(input: FotoHistoryInput): FotoHistoryRecord {
  return {
    id: input.id,
    profile_id: input.profileId,
    zona_id: input.zonaId,
    storage_path: input.storagePath,
    content_type: input.contentType,
    byte_size: input.byteSize,
    created_at: input.createdAt,
    resultado_etiqueta: input.resultadoEtiqueta,
    confianza: input.confianza,
    semaforo_dia: input.semaforoDia,
    semaforo_fecha: input.semaforoFecha,
    zona_etiqueta: input.zonaEtiqueta ?? null,
  }
}
