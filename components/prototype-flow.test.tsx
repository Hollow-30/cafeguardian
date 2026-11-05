// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { PrototypeFlow } from "./prototype-flow"

describe("PrototypeFlow", () => {
  it("abre el registro de fotos desde el panel del caficultor y permite volver", async () => {
    const user = userEvent.setup()
    render(<PrototypeFlow />)

    await user.type(screen.getByLabelText("Correo electrónico"), "caficultor@example.com")
    await user.type(screen.getByLabelText("Contraseña"), "secreto123")
    await user.click(screen.getByRole("button", { name: "Ingresar al panel" }))
    await user.click(screen.getByRole("button", { name: "Registrar foto de hoja" }))

    expect(screen.getByRole("heading", { name: "Sube una foto de tu hoja" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Volver al panel" }))
    expect(screen.getByText("Panel listo")).toBeInTheDocument()
  })
})
