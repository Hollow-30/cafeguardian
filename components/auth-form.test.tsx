// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthForm } from "./auth-form"

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithPassword: mocks.signIn, signUp: mocks.signUp } }) }))
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, "", "/login")
  mocks.signIn.mockResolvedValue({ data: { user: { id: "u1", app_metadata: {} } }, error: null })
  mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: "u1" } }, error: null })
})
function submit(mode: "login" | "register" = "login") {
  if (mode === "register") fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } })
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } })
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "clave123" } })
  fireEvent.click(screen.getByRole("button", { name: mode === "login" ? "Ingresar al panel" : "Crear mi cuenta" }))
}

describe("acceso desde la portada", () => {
  it("conserva el ingreso real y la redirección al historial solicitado", async () => {
    window.history.replaceState({}, "", "/login?next=%2Fhistorial")
    render(<AuthForm mode="login" />)
    submit()
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/historial"))
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "ana@example.com", password: "clave123" })
  })
  it("envía al administrador a su panel", async () => {
    mocks.signIn.mockResolvedValue({ data: { user: { app_metadata: { role: "superadministrador" } } }, error: null })
    render(<AuthForm mode="login" />)
    submit()
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/panel"))
  })
  it("mantiene la confirmación por correo sin fingir una sesión", async () => {
    render(<AuthForm mode="register" />)
    submit("register")
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu correo")
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@example.com", options: expect.objectContaining({ data: expect.objectContaining({ full_name: "Ana" }) }) }))
    expect(mocks.push).not.toHaveBeenCalled()
  })
  it("recupera el botón si no hay conexión", async () => {
    mocks.signIn.mockRejectedValue(new TypeError("Failed to fetch"))
    render(<AuthForm mode="login" />)
    submit()
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión")
    expect(screen.getByRole("button", { name: "Ingresar al panel" })).toBeEnabled()
  })
  it("permite mostrar la contraseña y volver a la portada", () => {
    render(<AuthForm mode="login" />)
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }))
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text")
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/")
  })
})
