// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppNavigation } from "./app-navigation"

vi.mock("next/navigation", () => ({ usePathname: () => "/historial/diagnostico-1" }))

describe("AppNavigation", () => {
  it("no muestra la navegación antes de iniciar sesión", () => {
    const { container } = render(<AppNavigation role={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("ofrece navegación a las funcionalidades de una sesión y marca la sección activa", () => {
    render(<AppNavigation role="superadministrador" />)

    expect(screen.getByRole("link", { name: "Nuevo diagnóstico" })).toHaveAttribute("href", "/diagnostico/nuevo")
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Planes" })).toHaveAttribute("href", "/planes")
    expect(screen.getByRole("link", { name: "Mis pagos" })).toHaveAttribute("href", "/mis-pagos")
    expect(screen.getByRole("link", { name: "Panel del equipo" })).toHaveAttribute("href", "/panel")
    expect(screen.queryByRole("link", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument()
  })
})
