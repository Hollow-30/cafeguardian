import { describe, expect, it } from "vitest"
import { diagnosisCopy, getDiagnosisOrigin, isConclusive, mapDiagnosisLabel } from "./diagnosis"

describe("diagnóstico", () => {
  it.each([[59, false], [60, true], [61, true]])("aplica el umbral al %s%%", (confidence, expected) => expect(isConclusive(confidence)).toBe(expected))
  it("mapea etiquetas a textos en español", () => {
    expect(mapDiagnosisLabel("rust").text).toBe("Roya")
    expect(mapDiagnosisLabel("healthy").text).toBe("Sana")
    expect(mapDiagnosisLabel("inconclusive").text).toBe("No concluyente")
  })
  it("mantiene el umbral configurable en content", () => expect(diagnosisCopy.confidenceThreshold).toBe(60))

  it("distingue simulación, modelo y registros sin procedencia", () => {
    expect(getDiagnosisOrigin(true)).toBe("Resultado de demostración")
    expect(getDiagnosisOrigin(false)).toBe("Resultado del modelo")
    expect(getDiagnosisOrigin(undefined)).toBe("Origen del diagnóstico no verificado")
  })
})
