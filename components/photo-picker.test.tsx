// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PhotoPicker } from "./photo-picker"

vi.mock("@/lib/image/compress", () => ({ compressImage: vi.fn(async (file: Blob) => file) }))
vi.mock("@/lib/storage/photosRepo", () => ({ savePhoto: vi.fn(async () => ({ id: "foto-1" })) }))

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
    await waitFor(() => expect(screen.getByText("Foto guardada. Queda pendiente de análisis.")).toBeInTheDocument())
  })

  it("permite volver al panel", async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<PhotoPicker onBack={onBack} />)

    await user.click(screen.getByRole("button", { name: "Volver al panel" }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
