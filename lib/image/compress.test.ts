import { describe, expect, it, vi } from "vitest"
import { compressImage } from "@/lib/image/compress"

describe("compressImage", () => {
  it("limita el lado mayor a 1280 px", async () => {
    const drawImage = vi.fn()
    const canvas: { width: number; height: number; getContext: () => { drawImage: typeof drawImage }; toBlob: BlobCallback | undefined } = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: undefined }
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 2560, height: 1000, close: vi.fn() }))
    vi.stubGlobal("document", { createElement: () => canvas })
    canvas.toBlob = (callback: BlobCallback) => callback(new Blob(["compressed"], { type: "image/jpeg" }))
    const result = await compressImage(new Blob(["source"], { type: "image/png" }))
    expect(canvas.width).toBe(1280)
    expect(canvas.height).toBe(500)
    expect(result.type).toBe("image/jpeg")
  })
})
