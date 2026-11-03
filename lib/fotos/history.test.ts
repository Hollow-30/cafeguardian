import { describe, expect, it } from "vitest"
import { buildFotoHistoryRecord } from "./history"

describe("foto history record", () => {
  it("stores photo, datetime, result, confidence, zone and daily semaforo for one user", () => {
    const record = buildFotoHistoryRecord({
      id: "11111111-1111-4111-8111-111111111111",
      profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      zonaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      storagePath: "fotos/11111111-1111-4111-8111-111111111111.jpg",
      contentType: "image/jpeg",
      byteSize: 2048,
      createdAt: "2026-11-02T15:00:00.000Z",
      resultadoEtiqueta: "posible_roya",
      confianza: 0.82,
      semaforoDia: "amarillo",
      semaforoFecha: "2026-11-02",
      zonaEtiqueta: "Alto Saposoa · Ejemplo",
    })

    expect(record).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      profile_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      zona_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      storage_path: "fotos/11111111-1111-4111-8111-111111111111.jpg",
      created_at: "2026-11-02T15:00:00.000Z",
      resultado_etiqueta: "posible_roya",
      confianza: 0.82,
      semaforo_dia: "amarillo",
      semaforo_fecha: "2026-11-02",
      zona_etiqueta: "Alto Saposoa · Ejemplo",
    })
    expect(record).not.toHaveProperty("email")
    expect(record).not.toHaveProperty("full_name")
  })
})
