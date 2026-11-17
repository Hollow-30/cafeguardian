// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PasswordRecoverForm } from "./password-recover-form"

const mocks = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resetPasswordForEmail: mocks.resetPasswordForEmail } }),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
})

describe("PasswordRecoverForm", () => {
  it("solicita el enlace de recuperación con redirect seguro", async () => {
    render(<PasswordRecoverForm />)
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }))

    await waitFor(() =>
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "ana@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/confirm?next="),
        }),
      ),
    )
    expect(await screen.findByRole("status")).toHaveTextContent(/enlace/i)
  })

  it("muestra error si el enlace venció", () => {
    render(<PasswordRecoverForm initialError="enlace" />)
    expect(screen.getByRole("alert")).toHaveTextContent(/venció|usó/i)
  })
})
