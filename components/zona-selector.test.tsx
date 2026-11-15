// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_ZONA } from "@/lib/semaforo/presentacion"

import { CambiarZona } from "./cambiar-zona"
import { ZonaSelector } from "./zona-selector"

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const zonas = [
  { id: "z1", nombre: "Alto Saposoa" },
  { id: "z2", nombre: "Saposoa" },
]

const respuesta = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response

afterEach(cleanup)

describe("ZonaSelector", () => {
  const fetchFalso = vi.fn()

  beforeEach(() => {
    mocks.refresh.mockReset()
    fetchFalso.mockReset()
    vi.stubGlobal("fetch", fetchFalso)
  })

  it("lista las zonas por nombre en botones de al menos 48 px", () => {
    render(<ZonaSelector zonas={zonas} />)

    expect(screen.getByRole("heading", { name: TEXTOS_ZONA.titulo })).toBeInTheDocument()
    const boton = screen.getByRole("button", { name: "Saposoa" })
    expect(boton).toHaveClass("min-h-12")
    expect(screen.getByRole("button", { name: "Alto Saposoa" })).toBeInTheDocument()
  })

  it("marca la zona actual", () => {
    render(<ZonaSelector zonas={zonas} zonaActualId="z2" />)

    expect(screen.getByRole("button", { name: "Saposoa" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Alto Saposoa" })).toHaveAttribute("aria-pressed", "false")
  })

  it("guarda la zona con PATCH, refresca la página y avisa que terminó", async () => {
    fetchFalso.mockResolvedValue(respuesta(200))
    const onListo = vi.fn()
    render(<ZonaSelector zonas={zonas} onListo={onListo} />)

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    expect(fetchFalso).toHaveBeenCalledWith("/api/perfil/zona", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zona_clima_id: "z2" }),
    })
    expect(onListo).toHaveBeenCalledTimes(1)
    expect(screen.getByText(TEXTOS_ZONA.guardada("Saposoa"))).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("mientras guarda muestra «Guardando…» y deshabilita los botones", async () => {
    let terminar: (valor: Response) => void = () => {}
    fetchFalso.mockReturnValue(new Promise<Response>((resolver) => (terminar = resolver)))
    render(<ZonaSelector zonas={zonas} />)

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    expect(await screen.findByText(TEXTOS_ZONA.guardando)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Saposoa" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Alto Saposoa" })).toBeDisabled()

    terminar(respuesta(200))
    await waitFor(() => expect(screen.getByRole("button", { name: "Saposoa" })).toBeEnabled())
  })

  it("si la zona ya no está disponible (422) muestra el error y no refresca", async () => {
    fetchFalso.mockResolvedValue(respuesta(422))
    const onListo = vi.fn()
    render(<ZonaSelector zonas={zonas} onListo={onListo} />)

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(TEXTOS_ZONA.errorZona)
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(onListo).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Saposoa" })).toBeEnabled()
  })

  it("si no hay sesión (401) lo dice", async () => {
    fetchFalso.mockResolvedValue(respuesta(401))
    render(<ZonaSelector zonas={zonas} />)

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(TEXTOS_ZONA.errorSesion)
  })

  it("si falla la red muestra el error general sin detalles", async () => {
    fetchFalso.mockRejectedValue(new Error("fallo de red interno"))
    render(<ZonaSelector zonas={zonas} />)

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(TEXTOS_ZONA.errorGuardar)
    expect(alerta).not.toHaveTextContent("fallo de red interno")
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("el mensaje de estado va en una región aria-live", () => {
    const { container } = render(<ZonaSelector zonas={zonas} />)

    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})

describe("CambiarZona", () => {
  beforeEach(() => {
    mocks.refresh.mockReset()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200)))
  })

  it("empieza cerrado y abre el selector con «Cambiar zona»", () => {
    render(<CambiarZona zonas={zonas} zonaActualId="z1" />)

    expect(screen.queryByRole("heading", { name: TEXTOS_ZONA.titulo })).not.toBeInTheDocument()
    const abrir = screen.getByRole("button", { name: TEXTOS_ZONA.cambiar })
    expect(abrir).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(abrir)

    expect(screen.getByRole("heading", { name: TEXTOS_ZONA.titulo })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alto Saposoa" })).toHaveAttribute("aria-pressed", "true")
  })

  it("se cierra solo después de guardar", async () => {
    render(<CambiarZona zonas={zonas} zonaActualId="z1" />)
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_ZONA.cambiar }))

    fireEvent.click(screen.getByRole("button", { name: "Saposoa" }))

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: TEXTOS_ZONA.titulo })).not.toBeInTheDocument(),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
