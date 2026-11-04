import { openDB, type DBSchema } from "idb"
import type { DiagnosisKey } from "@/content/diagnosis"

export type DiagnosisStatus = "offline" | "synced"
export type StoredDiagnosis = { id: string; photoId: string; blob: Blob; label: DiagnosisKey; confidence: number; status: DiagnosisStatus; createdAt: string; lote: string; note?: string }
interface DiagnosesDB extends DBSchema { photos: { key: string; value: unknown; indexes: { "by-created-at": string } }; diagnoses: { key: string; value: StoredDiagnosis; indexes: { "by-created-at": string } } }
const database = () => openDB<DiagnosesDB>("cafe-guardian", 2, { upgrade(db) { if (!db.objectStoreNames.contains("photos")) { const photos = db.createObjectStore("photos", { keyPath: "id" }); photos.createIndex("by-created-at", "createdAt") }; if (!db.objectStoreNames.contains("diagnoses")) { const store = db.createObjectStore("diagnoses", { keyPath: "id" }); store.createIndex("by-created-at", "createdAt") } } })
export async function saveDiagnosis(input: Omit<StoredDiagnosis, "id" | "createdAt" | "status"> & { status?: DiagnosisStatus }): Promise<StoredDiagnosis> { const diagnosis: StoredDiagnosis = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: input.status ?? "offline" }; const db = await database(); await db.put("diagnoses", diagnosis); return diagnosis }
export async function listDiagnoses(): Promise<StoredDiagnosis[]> { const db = await database(); return (await db.getAllFromIndex("diagnoses", "by-created-at")).reverse() }
export async function getDiagnosis(id: string) { const db = await database(); return db.get("diagnoses", id) }
export async function updateDiagnosisNote(id: string, note: string) { const db = await database(); const diagnosis = await db.get("diagnoses", id); if (!diagnosis) return undefined; const updated = { ...diagnosis, note }; await db.put("diagnoses", updated); return updated }
