// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppNavigation } from "./app-navigation"

vi.mock("next/navigation", () => ({ usePathname: () => "/historial/diagnostico-1" }))

describe("AppNavigation", () => {
  it("ofrece botones de navegación a las funcionalidades y marca la sección activa", () => {
    render(<AppNavigation />)

    expect(screen.getByRole("link", { name: "Nuevo diagnóstico" })).toHaveAttribute("href", "/diagnostico/nuevo")
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Planes" })).toHaveAttribute("href", "/planes")
    expect(screen.getByRole("link", { name: "Mis pagos" })).toHaveAttribute("href", "/mis-pagos")
    expect(screen.getByRole("link", { name: "Panel del equipo" })).toHaveAttribute("href", "/panel")
  })
})
