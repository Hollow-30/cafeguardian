// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import Page from "./page"
import { getAuthUser } from "@/lib/auth/session"

vi.mock("@/lib/auth/session", () => ({ getAuthUser: vi.fn() }))
vi.mock("@/components/farmer-home", () => ({ FarmerHome: ({ name }: { name: string }) => <div>{`Panel de ${name}`}</div> }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
afterEach(cleanup)

describe("entrada pública y sesión existente", () => {
  it("muestra la landing sin obligar a iniciar sesión", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    render(await Page())
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu café merece")
  })
  it("mantiene al caficultor autenticado en su inicio", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: "u1", user_metadata: { full_name: "Ana" } })
    render(await Page())
    expect(screen.getByText("Panel de Ana")).toBeVisible()
    expect(screen.queryByText("Demostración")).not.toBeInTheDocument()
  })
  it("mantiene la redirección del administrador", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ app_metadata: { role: "superadministrador" } })
    await expect(Page()).rejects.toThrow("REDIRECT:/panel")
  })
})
