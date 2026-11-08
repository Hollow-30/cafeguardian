import { afterEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/diagnostico/route"
import { classifyLeaf } from "./classifyLeaf"

vi.mock("@/lib/auth/session", () => ({ getAuthUser: vi.fn(async () => ({ id: "smoke-test-user" })) }))
afterEach(() => vi.restoreAllMocks())

// Enabled only by python -m ml.service.smoke, which starts a real local service.
describe.skipIf(process.env.CAFG107_SMOKE !== "1")("browser -> Next route -> real CPU service", () => {
  it("classifies bytes over HTTP using the real checkpoint", async () => {
    const networkFetch = globalThis.fetch.bind(globalThis)
    let totalTiming: string | null = null
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (url === "/api/diagnostico") {
        const response = await POST(new Request("http://localhost/api/diagnostico", options))
        totalTiming = response.headers.get("server-timing")
        return response
      }
      return networkFetch(url, options)
    })
    const bytes = Buffer.from(process.env.CAFG107_SMOKE_PHOTO!, "base64")
    const result = await classifyLeaf(new Blob([bytes], { type: "image/png" }))
    expect(result.isDemo).toBe(false)
    expect(["healthy", "rust"]).toContain(result.label)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
    expect(totalTiming).toMatch(/total;dur=\d+\.\d+/)
    console.info("LIVE_INFERENCE", JSON.stringify({ result, serverTiming: totalTiming }))
  }, 15_000)
})
