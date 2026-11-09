import { afterEach, describe, expect, it, vi } from "vitest"
import { uploadFotoRegistro } from "./upload-client"

afterEach(() => vi.restoreAllMocks())

const item = {
  id: "foto-1",
  profile_id: "user-1",
  zona_id: "zona-1",
  storage_path: "fotos/foto-1.jpg",
  content_type: "image/jpeg",
  byte_size: 12,
  created_at: "2026-11-09T00:00:00.000Z",
  resultado_etiqueta: "healthy",
  confianza: 88,
  semaforo_dia: null,
  semaforo_fecha: null,
  zona_etiqueta: "Lote A",
}

describe("uploadFotoRegistro", () => {
  it("envía multipart con lote, resultado y confianza", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ item }, { status: 201 }),
    )
    const blob = new Blob(["leaf"], { type: "image/jpeg" })

    await expect(
      uploadFotoRegistro({
        blob,
        lote: "Lote A",
        resultadoEtiqueta: "healthy",
        confianza: 88,
      }),
    ).resolves.toEqual(item)

    expect(spy).toHaveBeenCalledWith(
      "/api/fotos",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    )
    const body = spy.mock.calls[0][1]?.body as FormData
    expect(body.get("zona_etiqueta")).toBe("Lote A")
    expect(body.get("resultado_etiqueta")).toBe("healthy")
    expect(body.get("confianza")).toBe("88")
    expect(body.get("file")).toBeInstanceOf(Blob)
  })

  it("exige sesión cuando el servidor responde 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "No autenticado" }, { status: 401 }),
    )
    await expect(
      uploadFotoRegistro({ blob: new Blob(["leaf"], { type: "image/jpeg" }) }),
    ).rejects.toThrow(/Inicia sesión/)
  })
})
