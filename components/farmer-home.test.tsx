// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FarmerHome } from "./farmer-home"
import { loadHomeOverview } from "@/lib/home/overview"

vi.mock("@/lib/home/overview", () => ({ loadHomeOverview: vi.fn() }))
afterEach(cleanup)
beforeEach(() => vi.mocked(loadHomeOverview).mockReset().mockResolvedValue({ latest: null, warning: null }))

describe("inicio del caficultor", () => {
  it("saluda y permite empezar un diagnóstico sin datos ficticios", async () => {
    render(<FarmerHome name="Ana" />)
    expect(screen.getByText("Hola, Ana.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Revisar una hoja" })).toHaveAttribute("href", "/diagnostico/nuevo")
    expect(await screen.findByText("La historia de tu cafetal empieza aquí")).toBeVisible()
    expect(screen.getByRole("link", { name: "Ver mi historial" })).toHaveAttribute("href", "/historial")
  })
  it("sin aviso, el inicio queda como antes (tarjeta pegada al encabezado)", async () => {
    render(<FarmerHome name="Ana" />)
    expect(screen.queryByRole("status", { name: "Semáforo de roya de tu zona" })).not.toBeInTheDocument()
    expect(await screen.findByText("La historia de tu cafetal empieza aquí")).toBeVisible()
  })
  it("muestra el aviso entre el encabezado y la tarjeta «Revisar una hoja»", async () => {
    render(<FarmerHome name="Ana" aviso={<div role="status" aria-label="Semáforo de roya de tu zona">Aviso de prueba</div>} />)
    const aviso = screen.getByRole("status", { name: "Semáforo de roya de tu zona" })
    const saludo = screen.getByText("Hola, Ana.")
    const tarjeta = screen.getByRole("heading", { name: "Revisar una hoja" })
    expect(saludo.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(aviso.compareDocumentPosition(tarjeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("link", { name: "Revisar una hoja" })).toHaveAttribute("href", "/diagnostico/nuevo")
    expect(await screen.findByText("La historia de tu cafetal empieza aquí")).toBeVisible()
  })
  it("muestra el resultado real y enlaza a su detalle", async () => {
    vi.mocked(loadHomeOverview).mockResolvedValue({ latest: { id: "registro-1", label: "rust", confidence: 85, isDemo: true, status: "offline", createdAt: "2026-11-10T12:00:00Z", lote: "Lote A", imageUrl: "", source: "local", remoteId: null }, warning: "remoteUnavailable" })
    render(<FarmerHome name="" />)
    expect(await screen.findByText("Resultado de demostración")).toBeVisible()
    expect(screen.getByRole("link", { name: /Abrir registro/ })).toHaveAttribute("href", "/historial/registro-1")
    expect(screen.getByRole("status")).toHaveTextContent("Mostramos lo guardado en este teléfono")
  })
  it("ofrece reintentar ante un fallo y no muestra un vacío engañoso", async () => {
    vi.mocked(loadHomeOverview).mockResolvedValueOnce({ latest: null, warning: "unavailable" }).mockResolvedValueOnce({ latest: null, warning: null })
    render(<FarmerHome name="Ana" />)
    fireEvent.click(await screen.findByRole("button", { name: "Volver a intentar" }))
    expect(await screen.findByText("La historia de tu cafetal empieza aquí")).toBeVisible()
    expect(loadHomeOverview).toHaveBeenCalledTimes(2)
  })
})
