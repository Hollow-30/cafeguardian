// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PhotoPicker } from "./photo-picker"
import { uploadFotoRegistro } from "@/lib/fotos/upload-client"
import { saveDiagnosis } from "@/lib/storage/diagnosesRepo"

vi.mock("@/lib/image/compress", () => ({ compressImage: vi.fn(async (file: Blob) => file) }))
vi.mock("@/lib/storage/photosRepo", () => ({ savePhoto: vi.fn(async () => ({ id: "foto-1" })) }))
vi.mock("@/lib/diagnosis/classifyLeaf", () => ({ classifyLeaf: vi.fn(async () => ({ label: "healthy", confidence: 88, isDemo: true })) }))
vi.mock("@/lib/storage/diagnosesRepo", () => ({ saveDiagnosis: vi.fn(async () => ({ id: "diagnostico-1" })) }))
vi.mock("@/lib/fotos/upload-client", () => ({
  uploadFotoRegistro: vi.fn(async () => ({ id: "foto-remota-1" })),
}))

describe("PhotoPicker", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    class TestURL extends URL {
      static createObjectURL = vi.fn(() => "blob:foto")
      static revokeObjectURL = vi.fn()
    }
    vi.stubGlobal("URL", TestURL)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("permite elegir, previsualizar y guardar una foto", async () => {
    const user = userEvent.setup()
    const { container } = render(<PhotoPicker />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["image"], "hoja.jpg", { type: "image/jpeg" })
    await user.upload(input, file)
    expect(screen.getByAltText("Previsualización de la hoja seleccionada")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Usar esta foto" }))
    await waitFor(() => expect(screen.getByText("Resultado de demostración")).toBeInTheDocument())
    expect(screen.getByText("Es un apoyo para decidir, no reemplaza a tu técnico")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Guardar en historial" }))
    await waitFor(() =>
      expect(screen.getByText("Diagnóstico y foto guardados en tu historial.")).toBeInTheDocument(),
    )
    expect(screen.getByRole("link", { name: "Ver historial" })).toHaveAttribute("href", "/historial")
    expect(uploadFotoRegistro).toHaveBeenCalledWith(
      expect.objectContaining({ resultadoEtiqueta: "healthy", confianza: 88 }),
    )
    expect(saveDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({
        photoId: "foto-remota-1",
        label: "healthy",
        confidence: 88,
        isDemo: true,
        status: "synced",
      }),
    )
  })

  it("permite volver al panel", async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<PhotoPicker onBack={onBack} />)

    await user.click(screen.getByRole("button", { name: "Volver al panel" }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
