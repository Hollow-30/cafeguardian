import { openCafeGuardianDB, type StoredDiagnosis } from "./database"

export type { DiagnosisStatus, StoredDiagnosis } from "./database"

export async function saveDiagnosis(input: Omit<StoredDiagnosis, "id" | "createdAt" | "status"> & { isDemo: boolean; status?: StoredDiagnosis["status"] }): Promise<StoredDiagnosis> {
  const diagnosis: StoredDiagnosis = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: input.status ?? "offline" }
  const db = await openCafeGuardianDB()
  await db.put("diagnoses", diagnosis)
  return diagnosis
}

export async function listDiagnoses(): Promise<StoredDiagnosis[]> {
  const db = await openCafeGuardianDB()
  return (await db.getAllFromIndex("diagnoses", "by-created-at")).reverse()
}

export async function getDiagnosis(id: string) {
  const db = await openCafeGuardianDB()
  return db.get("diagnoses", id)
}

export async function updateDiagnosisNote(id: string, note: string) {
  const db = await openCafeGuardianDB()
  const diagnosis = await db.get("diagnoses", id)
  if (!diagnosis) return undefined
  const updated = { ...diagnosis, note }
  await db.put("diagnoses", updated)
  return updated
}

export async function deleteDiagnosis(id: string) {
  const db = await openCafeGuardianDB()
  await db.delete("diagnoses", id)
}

/** Borra locales ligados a una foto remota (photoId). */
export async function deleteDiagnosesByPhotoId(photoId: string) {
  const db = await openCafeGuardianDB()
  const all = await db.getAll("diagnoses")
  await Promise.all(
    all.filter((item) => item.photoId === photoId).map((item) => db.delete("diagnoses", item.id)),
  )
}
