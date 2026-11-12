import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadHomeOverview } from "./overview"
import { listDiagnoses, type StoredDiagnosis } from "@/lib/storage/diagnosesRepo"
import { fetchFotosHistorial } from "@/lib/fotos/history-client"
import type { FotoHistoryRecord } from "@/lib/fotos/history"

vi.mock("@/lib/storage/diagnosesRepo", () => ({ listDiagnoses: vi.fn() }))
vi.mock("@/lib/fotos/history-client", () => ({ fetchFotosHistorial: vi.fn() }))

const local: StoredDiagnosis = { id: "local", photoId: "foto", blob: new Blob(), label: "rust", confidence: 80, isDemo: true, status: "offline", createdAt: "2026-11-09T12:00:00Z", lote: "Lote A" }
const remote: FotoHistoryRecord = { id: "foto", profile_id: "u1", zona_id: "z1", storage_path: "foto.jpg", content_type: "image/jpeg", byte_size: 20, created_at: "2026-11-10T12:00:00Z", resultado_etiqueta: "healthy", confianza: .9, semaforo_dia: null, semaforo_fecha: null }

beforeEach(() => { vi.mocked(listDiagnoses).mockReset().mockResolvedValue([]); vi.mocked(fetchFotosHistorial).mockReset().mockResolvedValue([]) })

describe("resumen del inicio", () => {
  it("no inventa registros cuando no existen datos", async () => {
    expect(await loadHomeOverview()).toEqual({ latest: null, warning: null })
  })
  it("muestra el registro más reciente entre teléfono y cuenta", async () => {
    vi.mocked(listDiagnoses).mockResolvedValue([local])
    vi.mocked(fetchFotosHistorial).mockResolvedValue([remote])
    expect(await loadHomeOverview()).toMatchObject({ latest: { id: "foto", isDemo: false, source: "remote" }, warning: null })
  })
  it("recupera los datos locales y conserva la etiqueta de demostración sin conexión", async () => {
    vi.mocked(listDiagnoses).mockResolvedValue([local])
    vi.mocked(fetchFotosHistorial).mockRejectedValue(new Error("offline"))
    expect(await loadHomeOverview()).toMatchObject({ latest: { id: "local", isDemo: true }, warning: "remoteUnavailable" })
  })
  it("usa el registro remoto si el almacenamiento local falla", async () => {
    vi.mocked(listDiagnoses).mockRejectedValue(new Error("unavailable"))
    vi.mocked(fetchFotosHistorial).mockResolvedValue([remote])
    expect(await loadHomeOverview()).toMatchObject({ latest: { id: "foto" }, warning: "localUnavailable" })
  })
  it("distingue un fallo de carga de un historial vacío", async () => {
    vi.mocked(listDiagnoses).mockRejectedValue(new Error("unavailable"))
    vi.mocked(fetchFotosHistorial).mockRejectedValue(new Error("offline"))
    expect(await loadHomeOverview()).toEqual({ latest: null, warning: "unavailable" })
  })
  it("no inventa el origen de un registro antiguo", async () => {
    vi.mocked(listDiagnoses).mockResolvedValue([{ ...local, isDemo: undefined }])
    expect((await loadHomeOverview()).latest?.isDemo).toBeUndefined()
  })
  it("deduplica un registro sincronizado y conserva la nota local", async () => {
    vi.mocked(listDiagnoses).mockResolvedValue([{ ...local, status: "synced", note: "Volver a observar" }])
    vi.mocked(fetchFotosHistorial).mockResolvedValue([remote])
    expect(await loadHomeOverview()).toMatchObject({ latest: { id: "foto", note: "Volver a observar" } })
  })
})
