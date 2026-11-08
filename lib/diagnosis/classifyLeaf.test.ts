import { describe, expect, it, vi } from "vitest"
import { classifyLeaf, createLeafClassifier } from "./classifyLeaf"
import { parseClassification } from "./contract"
import { createMockProvider, mockScenarios, type MockScenario } from "./mock"

const photo = () => new Blob(["leaf"], { type: "image/jpeg" })

describe("classifyLeaf", () => {
  it("returns a typed demo classification without uploading", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    try {
      expect(await classifyLeaf(photo())).toEqual({ label: "healthy", confidence: 88, isDemo: true })
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it.each(Object.keys(mockScenarios) as MockScenario[])("reproduces scenario %s", async (scenario) => {
    const classify = createLeafClassifier(createMockProvider(scenario))
    const result = await classify(photo())
    expect(result).toEqual(mockScenarios[scenario])
    result.confidence = 0
    expect(await classify(photo())).toEqual(mockScenarios[scenario])
  })

  it("replaces the provider without changing the consumer contract", async () => {
    const blob = photo()
    const provider = vi.fn(async () => ({ label: "rust", confidence: 83.5, isDemo: false }))
    const classify = createLeafClassifier(provider)
    expect(await classify(blob)).toEqual({ label: "rust", confidence: 83.5, isDemo: false })
    expect(provider).toHaveBeenCalledWith(blob)
  })

  it.each([
    new Blob([], { type: "image/jpeg" }),
    new Blob(["text"], { type: "text/plain" }),
    new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/jpeg" }),
  ])("rejects invalid input before invoking the provider", async (blob) => {
    const provider = vi.fn(createMockProvider())
    await expect(createLeafClassifier(provider)(blob)).rejects.toThrow()
    expect(provider).not.toHaveBeenCalled()
  })

  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", async (type) => {
    await expect(classifyLeaf(new Blob(["leaf"], { type }))).resolves.toMatchObject({ isDemo: true })
  })

  it("propagates provider failures without inventing a diagnosis", async () => {
    const failure = new Error("Servicio no disponible")
    const classify = createLeafClassifier(async () => { throw failure })
    await expect(classify(photo())).rejects.toBe(failure)
  })

  it("validates responses at the provider boundary", async () => {
    const classify = createLeafClassifier(async () => ({ label: "rust", confidence: 101, isDemo: false }))
    await expect(classify(photo())).rejects.toThrow("confianza")
  })
})

describe("classification contract", () => {
  it.each([0, 59, 60, 100, 83.5])("accepts confidence %s", (confidence) => {
    expect(parseClassification({ label: "healthy", confidence, isDemo: false })).toEqual({ label: "healthy", confidence, isDemo: false })
  })

  it.each([null, undefined, [], "rust", {},
    { label: "ojoDeGallo", confidence: 90, isDemo: true },
    { label: "inconclusive", confidence: 55, isDemo: true },
    ...[-1, 101, NaN, Infinity, "88", undefined].map((confidence) => ({ label: "rust", confidence, isDemo: true })),
    ...[undefined, "false", 0].map((isDemo) => ({ label: "healthy", confidence: 88, isDemo })),
  ])("rejects invalid response %#", (value) => {
    expect(() => parseClassification(value)).toThrow()
  })
})
