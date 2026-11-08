import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getAuthUser } from "@/lib/auth/session"
import { POST } from "./route"

vi.mock("@/lib/auth/session", () => ({ getAuthUser: vi.fn() }))
const real = { label: "rust", confidence: 91.2, isDemo: false }
const token = "test-only-service-token-32-characters"
const request = (body: BodyInit = "image", headers = { "Content-Type": "image/jpeg" }) =>
  new Request("http://localhost/api/diagnostico", { method: "POST", body, headers })

beforeEach(() => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: "farmer" })
  vi.stubEnv("INFERENCE_SERVICE_URL", "http://127.0.0.1:8000/predict")
  vi.stubEnv("INFERENCE_SERVICE_TOKEN", token)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe("diagnosis proxy", () => {
  it("requires a session before reading a body or calling inference", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const spy = vi.spyOn(globalThis, "fetch")
    expect((await POST(request())).status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })

  it("forwards a bounded image with a server credential and measures total time", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(real))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(real)
    expect(response.headers.get("server-timing")).toMatch(/^total;dur=\d+\.\d+$/)
    expect(response.headers.get("cache-control")).toBe("no-store")
    const [url, options] = spy.mock.calls[0]
    expect(String(url)).toBe("http://127.0.0.1:8000/predict")
    expect(options).toMatchObject({ headers: { Authorization: `Bearer ${token}` }, redirect: "error" })
    expect(Buffer.from(options!.body as Buffer).toString()).toBe("image")
  })

  it.each(["", "http://example.com/predict", "https://user:password@example.com/predict"]) (
    "fails closed for missing or unsafe configuration %s", async (url) => {
      vi.stubEnv("INFERENCE_SERVICE_URL", url)
      const spy = vi.spyOn(globalThis, "fetch")
      expect((await POST(request())).status).toBe(503)
      expect(spy).not.toHaveBeenCalled()
    },
  )

  it("requires the service credential", async () => {
    vi.stubEnv("INFERENCE_SERVICE_TOKEN", "")
    expect((await POST(request())).status).toBe(503)
  })

  it.each([
    ["", "image/jpeg", 422], ["text", "text/plain", 415],
    [new Uint8Array(10 * 1024 * 1024 + 1), "image/jpeg", 413],
  ] as const)("rejects invalid upload %#", async (body, type, status) => {
    const spy = vi.spyOn(globalThis, "fetch")
    expect((await POST(request(body, { "Content-Type": type }))).status).toBe(status)
    expect(spy).not.toHaveBeenCalled()
  })

  it("bounds chunked uploads even if content-length lies", async () => {
    let reads = 0
    const body = new ReadableStream({ pull(controller) { reads++; controller.enqueue(new Uint8Array(1024 * 1024)) } })
    const req = new Request("http://localhost/api/diagnostico", {
      method: "POST", body, headers: { "Content-Type": "image/jpeg", "Content-Length": "1" }, duplex: "half",
    } as RequestInit)
    expect((await POST(req)).status).toBe(413)
    expect(reads).toBeLessThanOrEqual(13)
  })

  it.each([400, 413, 415, 422, 500, 401, 503])("handles upstream HTTP %s without leaking details", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private upstream details", { status }))
    const response = await POST(request())
    expect(response.status).toBe([400, 413, 415, 422].includes(status) ? status : 503)
    expect(await response.text()).not.toContain("private")
  })

  it.each([null, { ...real, isDemo: true }, { ...real, confidence: -1 }])("rejects invalid upstream response %#", async (body) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body))
    expect((await POST(request())).status).toBe(502)
  })

  it("handles a network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("unreachable"))
    expect((await POST(request())).status).toBe(502)
  })

  it("times out while waiting for inference", async () => {
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
      const pending = POST(request())
      await vi.advanceTimersByTimeAsync(30_000)
      expect((await pending).status).toBe(504)
    } finally { vi.useRealTimers() }
  })
})
