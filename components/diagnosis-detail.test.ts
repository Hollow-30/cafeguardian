// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { diagnosisSummary, shareDiagnosis } from "./diagnosis-detail"
import type { StoredDiagnosis } from "@/lib/storage/diagnosesRepo"

const diagnosis: StoredDiagnosis = { id: "1", photoId: "p1", blob: new Blob(["leaf"], { type: "image/jpeg" }), label: "healthy", confidence: 88, status: "offline", createdAt: "2026-11-04T10:00:00.000Z", lote: "Lote A" }

describe("detalle del historial", () => {
  afterEach(() => vi.restoreAllMocks())

  it("crea un resumen legible del registro", () => {
    expect(diagnosisSummary(diagnosis)).toContain("Sana")
    expect(diagnosisSummary(diagnosis)).toContain("88%")
  })

  it.each([
    [true, "Resultado de demostración"],
    [false, "Resultado del modelo"],
    [undefined, "Origen del diagnóstico no verificado"],
  ] as const)("conserva el origen %s en el resumen compartido", (isDemo, expected) => {
    expect(diagnosisSummary({ ...diagnosis, isDemo })).toContain(expected)
  })

  it("usa fallback de descarga y copia cuando Web Share no existe", async () => {
    const click = vi.fn()
    vi.spyOn(document, "createElement").mockReturnValue({ href: "", download: "", click } as unknown as HTMLAnchorElement)
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const result = await shareDiagnosis(diagnosis, "blob:leaf")
    expect(result).toBe("fallback")
    expect(click).toHaveBeenCalled()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Sana"))
  })
})
