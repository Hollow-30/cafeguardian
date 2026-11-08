import { openDB, type DBSchema } from "idb"
import type { DiagnosisKey } from "@/content/diagnosis"

export type PhotoStatus = "pending-analysis"
export type StoredPhoto = { id: string; blob: Blob; lote: string; status: PhotoStatus; createdAt: string }

export type DiagnosisStatus = "offline" | "synced"
export type StoredDiagnosis = {
  id: string
  photoId: string
  blob: Blob
  label: DiagnosisKey
  confidence: number
  isDemo?: boolean
  status: DiagnosisStatus
  createdAt: string
  lote: string
  note?: string
}

interface CafeGuardianDB extends DBSchema {
  photos: { key: string; value: StoredPhoto; indexes: { "by-created-at": string } }
  diagnoses: { key: string; value: StoredDiagnosis; indexes: { "by-created-at": string } }
}

export function openCafeGuardianDB() {
  return openDB<CafeGuardianDB>("cafe-guardian", 2, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" })
      }
      const photos = transaction.objectStore("photos")
      if (!photos.indexNames.contains("by-created-at")) {
        photos.createIndex("by-created-at", "createdAt")
      }

      if (!db.objectStoreNames.contains("diagnoses")) {
        db.createObjectStore("diagnoses", { keyPath: "id" })
      }
      const diagnoses = transaction.objectStore("diagnoses")
      if (!diagnoses.indexNames.contains("by-created-at")) {
        diagnoses.createIndex("by-created-at", "createdAt")
      }
    },
  })
}
