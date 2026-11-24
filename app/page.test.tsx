// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Page from "./page"
import { getAuthUser } from "@/lib/auth/session"
import { leerSemaforo } from "@/lib/semaforo/leer"
import { createClient } from "@/lib/supabase/server"

vi.mock("@/lib/auth/session", () => ({ getAuthUser: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/semaforo/leer", () => ({ leerSemaforo: vi.fn() }))
vi.mock("@/components/farmer-home", () => ({ FarmerHome: ({ name, aviso }: { name: string; aviso?: ReactNode }) => <div>{`Panel de ${name}`}{aviso}</div> }))
vi.mock("@/components/aviso-semaforo", () => ({ AvisoSemaforo: ({ decision }: { decision: { tipo: string } }) => <div>{`Aviso ${decision.tipo}`}</div> }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
beforeEach(() => {
  vi.mocked(createClient).mockReset().mockResolvedValue({} as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(leerSemaforo).mockReset().mockResolvedValue({ error: false, zona: null, riesgo: null })
})
afterEach(cleanup)

const ZONA = { id: "z1", nombre: "Saposoa" }
const hoyEnLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date())

describe("entrada pública y sesión existente", () => {
  it("muestra la landing sin obligar a iniciar sesión", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    render(await Page())
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu café merece")
    expect(leerSemaforo).not.toHaveBeenCalled()
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

describe("aviso del semáforo en el inicio", () => {
  const caficultor = { id: "u1", user_metadata: { full_name: "Ana" } }

  it("sin zona elegida: el caficultor ve la invitación", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(caficultor)
    render(await Page())
    expect(screen.getByText("Aviso invitacion")).toBeInTheDocument()
    expect(leerSemaforo).toHaveBeenCalledWith(expect.anything(), "u1")
  })

  it("con dato del día: el caficultor ve el aviso según el nivel", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(caficultor)
    vi.mocked(leerSemaforo).mockResolvedValue({
      error: false,
      zona: ZONA,
      riesgo: { fecha: hoyEnLima(), nivel: "muy_favorable", indice: 0.9, motivo: "Frase.", detalle: null },
    })
    render(await Page())
    expect(screen.getByText("Aviso bloque")).toBeInTheDocument()
  })

  it.each([
    ["error de lectura", { error: true, zona: null, riesgo: null }],
    ["zona sin dato", { error: false, zona: ZONA, riesgo: null }],
    ["dato vencido", { error: false, zona: ZONA, riesgo: { fecha: "2020-01-01", nivel: "favorable", indice: 0.6, motivo: "Frase.", detalle: null } }],
  ])("%s: el inicio sigue y no hay aviso", async (_nombre, lectura) => {
    vi.mocked(getAuthUser).mockResolvedValue(caficultor)
    vi.mocked(leerSemaforo).mockResolvedValue(lectura)
    render(await Page())
    expect(screen.getByText("Panel de Ana")).toBeVisible()
    expect(screen.queryByText(/^Aviso /)).not.toBeInTheDocument()
  })

  it("si leer el semáforo lanza un error, el inicio sigue sin aviso", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(caficultor)
    vi.mocked(leerSemaforo).mockRejectedValue(new Error("falló"))
    render(await Page())
    expect(screen.getByText("Panel de Ana")).toBeVisible()
    expect(screen.queryByText(/^Aviso /)).not.toBeInTheDocument()
  })

  it("si no se puede crear el cliente de Supabase, el inicio sigue sin aviso", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(caficultor)
    vi.mocked(createClient).mockRejectedValue(new Error("sin cookies"))
    render(await Page())
    expect(screen.getByText("Panel de Ana")).toBeVisible()
    expect(screen.queryByText(/^Aviso /)).not.toBeInTheDocument()
  })

  it("el superadministrador sigue yendo a /panel y no se lee el semáforo", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: "admin", app_metadata: { role: "superadministrador" } })
    await expect(Page()).rejects.toThrow("REDIRECT:/panel")
    expect(createClient).not.toHaveBeenCalled()
    expect(leerSemaforo).not.toHaveBeenCalled()
  })
})
