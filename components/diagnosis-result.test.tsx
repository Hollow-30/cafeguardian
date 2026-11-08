import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { DiagnosisResult } from "./diagnosis-result"
import { createLeafClassifier } from "@/lib/diagnosis/classifyLeaf"
import { createMockProvider, type MockScenario } from "@/lib/diagnosis/mock"

describe("classification consumer compatibility", () => {
  it.each([
    ["healthy", "Sana"],
    ["rust", "Roya"],
    ["healthy-low-confidence", "No concluyente"],
    ["rust-low-confidence", "No concluyente"],
  ] as [MockScenario, string][])("renders mock scenario %s", async (scenario, expected) => {
    const classify = createLeafClassifier(createMockProvider(scenario))
    const result = await classify(new Blob(["leaf"], { type: "image/jpeg" }))
    const html = renderToStaticMarkup(<DiagnosisResult {...result} src="/leaf.jpg" onSave={() => {}} onAnother={() => {}} />)
    expect(html).toContain(expected)
    expect(html).toContain("Resultado de demostración")
    expect(html).not.toContain("Ojo de gallo")
  })

  it("renders a replacement provider with the same props and no demo marker", async () => {
    const classify = createLeafClassifier(async () => ({ label: "rust", confidence: 60, isDemo: false }))
    const result = await classify(new Blob(["leaf"], { type: "image/jpeg" }))
    const html = renderToStaticMarkup(<DiagnosisResult {...result} src="/leaf.jpg" onSave={() => {}} onAnother={() => {}} />)
    expect(html).toContain("Roya")
    expect(html).toContain("60%")
    expect(html).not.toContain("Resultado de demostración")
    expect(html).not.toContain("No concluyente")
  })
})
