import { describe, expect, it } from "vitest"
import { confidenceToPercent, mergeHistoryEntries, remoteFotoToEntry, type HistoryEntry } from "./entries"

describe("confidenceToPercent", () => {
  it.each([
    [0.882, 88.2],
    [88, 88],
    [null, 0],
  ])("%j → %j", (input, expected) => {
    expect(confidenceToPercent(input)).toBe(expected)
  })
})

describe("remoteFotoToEntry", () => {
  it("mapea etiqueta y URL de archivo", () => {
    expect(
      remoteFotoToEntry({
        id: "foto-1",
        profile_id: "u1",
        zona_id: "z1",
        storage_path: "fotos/foto-1.jpg",
        content_type: "image/jpeg",
        byte_size: 10,
        created_at: "2026-11-09T12:00:00.000Z",
        resultado_etiqueta: "healthy",
        confianza: 0.91,
        semaforo_dia: null,
        semaforo_fecha: null,
        zona_etiqueta: "Lote A",
      }),
    ).toMatchObject({
      id: "foto-1",
      label: "healthy",
      confidence: 91,
      status: "synced",
      lote: "Lote A",
      imageUrl: "/api/fotos/foto-1/archivo",
      source: "remote",
      remoteId: "foto-1",
    })
  })
})

describe("mergeHistoryEntries", () => {
  it("deduplica local synced contra remoto y conserva offline", () => {
    const remote: HistoryEntry[] = [
      {
        id: "foto-1",
        label: "rust",
        confidence: 90,
        isDemo: false,
        status: "synced",
        createdAt: "2026-11-09T12:00:00.000Z",
        lote: "A",
        imageUrl: "/api/fotos/foto-1/archivo",
        source: "remote",
        remoteId: "foto-1",
      },
    ]
    const local: HistoryEntry[] = [
      {
        id: "local-synced",
        label: "rust",
        confidence: 90,
        isDemo: false,
        status: "synced",
        createdAt: "2026-11-09T12:00:00.000Z",
        lote: "A",
        note: "revisar",
        imageUrl: "",
        source: "local",
        remoteId: "foto-1",
      },
      {
        id: "local-offline",
        label: "healthy",
        confidence: 80,
        isDemo: true,
        status: "offline",
        createdAt: "2026-11-08T12:00:00.000Z",
        lote: "",
        imageUrl: "",
        source: "local",
        remoteId: null,
      },
    ]

    const merged = mergeHistoryEntries(remote, local)
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({ id: "foto-1", note: "revisar", imageUrl: "/api/fotos/foto-1/archivo" })
    expect(merged[1].id).toBe("local-offline")
  })
})
