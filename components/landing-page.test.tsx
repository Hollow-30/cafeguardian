// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { LandingPage } from "./landing-page"

afterEach(cleanup)

describe("portada pública", () => {
  it("ofrece registro e ingreso con una sola propuesta principal", () => {
    render(<LandingPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu café merece un buen guardián.")
    for (const link of screen.getAllByRole("link", { name: /Crear mi cuenta/ })) expect(link).toHaveAttribute("href", "/registro")
    for (const link of screen.getAllByRole("link", { name: "Ingresar" })) expect(link).toHaveAttribute("href", "/login")
    expect(screen.getByText("Demostración")).toBeVisible()
    expect(screen.getByText(/No es un análisis de esta imagen/)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Guardar en mi historial" })).not.toBeInTheDocument()
  })

  it("permite descubrir los pasos y resolver dudas de conexión al abrir las preguntas", async () => {
    const user = userEvent.setup()
    render(<LandingPage />)
    expect(screen.getByRole("link", { name: "Conoce cómo funciona" })).toHaveAttribute("href", "#como-funciona")
    const question = screen.getByText("¿Funciona sin internet?")
    question.focus()
    await user.click(question)
    expect(question.closest("details")).toHaveAttribute("open")
    expect(screen.getByText(/Para abrir la app, ingresar a tu cuenta o analizar fotos necesitas conexión/)).toBeVisible()
    await user.click(question)
    expect(question.closest("details")).not.toHaveAttribute("open")
  })

  it("tiene destinos existentes en la página, imágenes locales y alternativas", () => {
    const { container } = render(<LandingPage />)
    for (const link of container.querySelectorAll('a[href^="#"]')) {
      const id = link.getAttribute("href")!.slice(1)
      expect(document.getElementById(id)).not.toBeNull()
    }
    for (const image of screen.getAllByRole("img")) {
      expect(image).toHaveAttribute("alt", expect.stringMatching(/\S/))
      expect(decodeURIComponent(image.getAttribute("src")!)).toContain("/images/")
    }
  })
})
