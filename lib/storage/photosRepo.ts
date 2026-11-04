import { openDB, type DBSchema } from "idb"

export type PhotoStatus = "pending-analysis"
export type StoredPhoto = { id: string; blob: Blob; lote: string; status: PhotoStatus; createdAt: string }

interface PhotosDB extends DBSchema {
  photos: { key: string; value: StoredPhoto; indexes: { "by-created-at": string } }
}

const database = () => openDB<PhotosDB>("cafe-guardian", 1, { upgrade(db) {
  const store = db.createObjectStore("photos", { keyPath: "id" })
  store.createIndex("by-created-at", "createdAt")
} })

export async function savePhoto(input: { blob: Blob; lote?: string }): Promise<StoredPhoto> {
  const photo: StoredPhoto = { id: crypto.randomUUID(), blob: input.blob, lote: input.lote?.trim() ?? "", status: "pending-analysis", createdAt: new Date().toISOString() }
  const db = await database()
  await db.put("photos", photo)
  return photo
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  const db = await database()
  return db.getAllFromIndex("photos", "by-created-at")
}
