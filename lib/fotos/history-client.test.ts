import { afterEach, describe, expect, it, vi } from "vitest"
import { deleteFotoHistorial, fetchFotosHistorial } from "./history-client"

afterEach(() => vi.restoreAllMocks())

describe("history-client", () => {
  it("lista items del GET /api/fotos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ items: [{ id: "f1" }] }, { status: 200 }),
    )
    await expect(fetchFotosHistorial()).resolves.toEqual([{ id: "f1" }])
    expect(fetch).toHaveBeenCalledWith("/api/fotos", expect.objectContaining({ credentials: "same-origin" }))
  })

  it("borra con DELETE /api/fotos/[id]", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ok: true }))
    await deleteFotoHistorial("f1")
    expect(spy).toHaveBeenCalledWith("/api/fotos/f1", expect.objectContaining({ method: "DELETE" }))
  })
})
