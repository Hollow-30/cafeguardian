import { afterEach, describe, expect, it, vi } from "vitest"
import { createHttpProvider } from "./http"

afterEach(() => vi.restoreAllMocks())
const photo = new Blob(["leaf"], { type: "image/png" })

describe("real classification provider", () => {
  it("sends the image without credentials and preserves the real contract", async () => {
    const result = { label: "rust", confidence: 97.4, isDemo: false }
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result))
    expect(await createHttpProvider()(photo)).toEqual(result)
    expect(fetchSpy).toHaveBeenCalledWith("/api/diagnostico", expect.objectContaining({
      body: photo, headers: { "Content-Type": "image/png" }, cache: "no-store", signal: expect.any(AbortSignal),
    }))
  })

  it.each([401, 413, 415, 422, 503, 504])("rejects HTTP %s without returning a demo", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("internal message", { status }))
    await expect(createHttpProvider()(photo)).rejects.toThrow()
  })

  it.each([
    { label: "rust", confidence: 99, isDemo: true },
    { label: "rust", confidence: 101, isDemo: false },
    { label: "unknown", confidence: 90, isDemo: false },
  ])("rejects invalid and simulated responses %#", async (result) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result))
    await expect(createHttpProvider()(photo)).rejects.toThrow()
  })

  it("reports a network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"))
    await expect(createHttpProvider()(photo)).rejects.toThrow("conexión")
  })

  it("cancels a stalled request", async () => {
    vi.useFakeTimers()
    const timeout = new AbortController()
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      setTimeout(() => timeout.abort(), ms)
      return timeout.signal
    })
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("timeout")))
    }))
    try {
      const assertion = expect(createHttpProvider()(photo)).rejects.toThrow("conectar")
      await vi.advanceTimersByTimeAsync(35_000)
      await assertion
      expect(timeout.signal.aborted).toBe(true)
    } finally { vi.useRealTimers() }
  })
})
