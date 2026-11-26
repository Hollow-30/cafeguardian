// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PasswordUpdateForm } from "./password-update-form"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser, updateUser: mocks.updateUser } }),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", app_metadata: {} } }, error: null })
  mocks.updateUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
})

describe("PasswordUpdateForm", () => {
  it("guarda la nueva contraseña cuando hay sesión de recuperación", async () => {
    render(<PasswordUpdateForm />)
    await screen.findByLabelText("Contraseña")
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "nueva123" } })
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "nueva123" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "nueva123" }))
    expect(mocks.push).toHaveBeenCalled()
  })

  it("pide un enlace nuevo si no hay sesión", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    render(<PasswordUpdateForm />)
    expect(await screen.findByRole("alert")).toHaveTextContent(/enlace/i)
    expect(screen.getByRole("link", { name: /enlace nuevo/i })).toHaveAttribute("href", "/recuperar")
  })

  it("valida que las contraseñas coincidan", async () => {
    render(<PasswordUpdateForm />)
    await screen.findByLabelText("Contraseña")
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "nueva123" } })
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "otra" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/no coinciden/i)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
