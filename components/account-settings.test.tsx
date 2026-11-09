// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AccountSettings } from "./account-settings"

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { updateUser: mocks.updateUser } }),
}))

afterEach(cleanup)

describe("AccountSettings", () => {
  beforeEach(() => {
    mocks.updateUser.mockReset().mockResolvedValue({ error: null })
    mocks.refresh.mockReset()
  })

  it("guarda los datos de perfil y solicita confirmar un correo nuevo", async () => {
    render(<AccountSettings email="ana@example.com" name="Ana" avatarUrl="" />)

    fireEvent.change(screen.getByLabelText("Nombre de usuario"), { target: { value: "Ana Pérez" } })
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana.perez@example.com" } })
    fireEvent.change(screen.getByLabelText("Avatar (URL de imagen)"), { target: { value: "https://example.com/avatar.jpg" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({
      email: "ana.perez@example.com",
      data: { full_name: "Ana Pérez", avatar_url: "https://example.com/avatar.jpg" },
    }))
    expect(await screen.findByText(/Revisa tu correo para confirmar el cambio/)).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it("no intenta cambiar la contraseña si la confirmación no coincide", async () => {
    render(<AccountSettings email="ana@example.com" name="Ana" avatarUrl="" />)

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "clave123" } })
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "clave456" } })
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.")
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
