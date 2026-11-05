import { openCafeGuardianDB, type StoredPhoto } from "./database"

export type { PhotoStatus, StoredPhoto } from "./database"

export async function savePhoto(input: { blob: Blob; lote?: string }): Promise<StoredPhoto> {
  const photo: StoredPhoto = { id: crypto.randomUUID(), blob: input.blob, lote: input.lote?.trim() ?? "", status: "pending-analysis", createdAt: new Date().toISOString() }
  const db = await openCafeGuardianDB()
  await db.put("photos", photo)
  return photo
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  const db = await openCafeGuardianDB()
  return db.getAllFromIndex("photos", "by-created-at")
}
