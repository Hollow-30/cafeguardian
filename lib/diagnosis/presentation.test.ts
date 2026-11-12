import { describe, expect, it } from "vitest"
import { getResultPresentation } from "./presentation"

describe("presentación del resultado", () => {
  it("reserva el verde para una hoja sana con confianza suficiente", () => {
    expect(getResultPresentation("healthy", 90)).toEqual({ result: "healthy", tone: "green" })
  })
  it("muestra roya en rojo en lugar de verde aunque la confianza sea alta", () => {
    expect(getResultPresentation("rust", 90)).toEqual({ result: "rust", tone: "red" })
  })
  it.each(["healthy", "rust", "inconclusive"] as const)("muestra incertidumbre para %s con poca confianza", (label) => {
    expect(getResultPresentation(label, 30)).toEqual({ result: "inconclusive", tone: "yellow" })
  })
  it("no presenta un resultado no concluyente como sano", () => {
    expect(getResultPresentation("inconclusive", 90)).toEqual({ result: "inconclusive", tone: "yellow" })
  })
})
