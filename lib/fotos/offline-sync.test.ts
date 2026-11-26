import { beforeEach, describe, expect, it, vi } from "vitest"
import { syncOfflineDiagnoses } from "./offline-sync"

const mocks = vi.hoisted(() => ({
  listOfflineDiagnoses: vi.fn(),
  markDiagnosisSynced: vi.fn(),
  saveDiagnosis: vi.fn(),
  uploadFotoRegistro: vi.fn(),
  listPhotos: vi.fn(),
  fetchSemaforoSnapshot: vi.fn(),
  classifyLeaf: vi.fn(),
}))

vi.mock("@/lib/storage/diagnosesRepo", () => ({
  listOfflineDiagnoses: mocks.listOfflineDiagnoses,
  markDiagnosisSynced: mocks.markDiagnosisSynced,
  saveDiagnosis: mocks.saveDiagnosis,
}))
vi.mock("@/lib/storage/photosRepo", () => ({
  listPhotos: mocks.listPhotos,
}))
vi.mock("@/lib/fotos/upload-client", () => ({
  uploadFotoRegistro: mocks.uploadFotoRegistro,
}))
vi.mock("@/lib/fotos/semaforo-snapshot", () => ({
  fetchSemaforoSnapshot: mocks.fetchSemaforoSnapshot,
}))
vi.mock("@/lib/diagnosis/classifyLeaf", () => ({
  classifyLeaf: mocks.classifyLeaf,
}))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true })
  mocks.listPhotos.mockResolvedValue([])
  mocks.fetchSemaforoSnapshot.mockResolvedValue({ semaforoDia: "amarillo", semaforoFecha: "2026-11-25" })
  mocks.listOfflineDiagnoses.mockResolvedValue([])
})

describe("syncOfflineDiagnoses", () => {
  it("sube pendientes y los marca synced", async () => {
    mocks.listOfflineDiagnoses.mockResolvedValue([
      {
        id: "d1",
        photoId: "local-1",
        blob: new Blob(["x"], { type: "image/jpeg" }),
        label: "rust",
        confidence: 80,
        status: "offline",
        createdAt: "2026-11-24T00:00:00.000Z",
        lote: "Lote 1",
        consentimientoAnonimo: true,
      },
    ])
    mocks.uploadFotoRegistro.mockResolvedValue({ id: "remote-1" })
    mocks.markDiagnosisSynced.mockResolvedValue({})

    await expect(syncOfflineDiagnoses()).resolves.toBe(1)
    expect(mocks.uploadFotoRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        consentimientoAnonimo: true,
        lote: "Lote 1",
        semaforoDia: "amarillo",
      }),
    )
    expect(mocks.markDiagnosisSynced).toHaveBeenCalledWith("d1", "remote-1")
  })

  it("no intenta sync sin conexión", async () => {
    Object.defineProperty(globalThis.navigator, "onLine", { value: false, configurable: true })
    await expect(syncOfflineDiagnoses()).resolves.toBe(0)
    expect(mocks.listOfflineDiagnoses).not.toHaveBeenCalled()
  })
})
