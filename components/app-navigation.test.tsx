// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppNavigation } from "./app-navigation"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}))

afterEach(cleanup)

vi.mock("next/navigation", () => ({
  usePathname: () => "/historial/diagnostico-1",
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut } }),
}))

describe("AppNavigation", () => {
  beforeEach(() => {
    mocks.replace.mockReset()
    mocks.refresh.mockReset()
    mocks.signOut.mockReset().mockResolvedValue({ error: null })
  })

  it("no muestra la navegación antes de iniciar sesión", () => {
    const { container } = render(<AppNavigation role={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("ofrece navegación a las funcionalidades de una sesión y marca la sección activa", () => {
    render(<AppNavigation role="superadministrador" user={{ email: "ana@example.com", user_metadata: { full_name: "Ana" } }} />)

    expect(screen.getByRole("link", { name: "Nuevo diagnóstico" })).toHaveAttribute("href", "/diagnostico/nuevo")
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Planes" })).toHaveAttribute("href", "/planes")
    expect(screen.getByRole("link", { name: "Mis pagos" })).toHaveAttribute("href", "/mis-pagos")
    expect(screen.getByRole("link", { name: "Panel del equipo" })).toHaveAttribute("href", "/panel")
    expect(screen.queryByRole("link", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument()
  })

  it("abre el menú con opciones de cuenta, suscripción y ayuda, y lo cierra con Escape", () => {
    render(<AppNavigation role="caficultor" user={{ email: "ana@example.com", user_metadata: { full_name: "Ana" } }} />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de usuario" }))

    expect(screen.getByText("ana@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Mi cuenta" })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: "Mejorar plan" })).toHaveAttribute("href", "/planes")
    expect(screen.getByRole("link", { name: "Contacto" })).toHaveAttribute("href", "/contacto")
    expect(screen.getByRole("link", { name: "Soporte" })).toHaveAttribute("href", "/soporte")
    expect(screen.getByRole("link", { name: "Centro de ayuda" })).toHaveAttribute("href", "/ayuda")

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument()
  })

  it("cierra el menú al hacer clic fuera", () => {
    render(<AppNavigation role="caficultor" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de usuario" }))
    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument()
  })

  it("cierra la sesión y redirige al login", async () => {
    render(<AppNavigation role="caficultor" />)
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de usuario" }))
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledOnce()
      expect(mocks.replace).toHaveBeenCalledWith("/login")
      expect(mocks.refresh).toHaveBeenCalledOnce()
    })
  })
})
