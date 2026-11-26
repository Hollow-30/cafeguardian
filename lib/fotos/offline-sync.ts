import { fetchSemaforoSnapshot } from "@/lib/fotos/semaforo-snapshot"
import { uploadFotoRegistro } from "@/lib/fotos/upload-client"
import { listOfflineDiagnoses, markDiagnosisSynced } from "@/lib/storage/diagnosesRepo"
import { listPhotos } from "@/lib/storage/photosRepo"
import { saveDiagnosis } from "@/lib/storage/diagnosesRepo"
import { classifyLeaf } from "@/lib/diagnosis/classifyLeaf"

/** Sube diagnósticos guardados offline y analiza fotos pendientes. */
export async function syncOfflineDiagnoses(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0

  let synced = 0
  const semaforo = await fetchSemaforoSnapshot()

  // Fotos capturadas offline sin análisis aún.
  try {
    const photos = await listPhotos()
    const pendingPhotos = photos.filter((photo) => photo.status === "pending-analysis")
    for (const photo of pendingPhotos) {
      try {
        const result = await classifyLeaf(photo.blob)
        const remote = await uploadFotoRegistro({
          blob: photo.blob,
          lote: photo.lote,
          resultadoEtiqueta: result.label,
          confianza: result.confidence,
          semaforoDia: semaforo.semaforoDia,
          semaforoFecha: semaforo.semaforoFecha,
        })
        await saveDiagnosis({
          photoId: remote.id,
          blob: photo.blob,
          label: result.label,
          confidence: result.confidence,
          isDemo: result.isDemo,
          lote: photo.lote,
          status: "synced",
        })
        synced += 1
      } catch {
        // Se conserva la foto pendiente.
      }
    }
  } catch {
    // IndexedDB puede no estar listo.
  }

  const pending = await listOfflineDiagnoses()
  for (const item of pending) {
    try {
      const remote = await uploadFotoRegistro({
        blob: item.blob,
        lote: item.lote,
        resultadoEtiqueta: item.label,
        confianza: item.confidence,
        consentimientoAnonimo: item.consentimientoAnonimo,
        semaforoDia: semaforo.semaforoDia,
        semaforoFecha: semaforo.semaforoFecha,
      })
      await markDiagnosisSynced(item.id, remote.id)
      synced += 1
    } catch {
      // Se conserva para el próximo intento.
    }
  }

  return synced
}
