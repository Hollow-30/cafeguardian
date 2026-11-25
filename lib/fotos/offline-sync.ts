import { uploadFotoRegistro } from "@/lib/fotos/upload-client"
import { listOfflineDiagnoses, markDiagnosisSynced } from "@/lib/storage/diagnosesRepo"

/** Sube diagnósticos guardados offline. Devuelve cuántos se sincronizaron. */
export async function syncOfflineDiagnoses(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0

  const pending = await listOfflineDiagnoses()
  let synced = 0

  for (const item of pending) {
    try {
      const remote = await uploadFotoRegistro({
        blob: item.blob,
        lote: item.lote,
        resultadoEtiqueta: item.label,
        confianza: item.confidence,
        consentimientoAnonimo: item.consentimientoAnonimo,
      })
      await markDiagnosisSynced(item.id, remote.id)
      synced += 1
    } catch {
      // Se conserva para el próximo intento.
    }
  }

  return synced
}
