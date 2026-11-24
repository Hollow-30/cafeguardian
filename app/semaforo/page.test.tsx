// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getAuthUser } from "@/lib/auth/session"
import { leerSemaforo } from "@/lib/semaforo/leer"
import { leerZonasActivas } from "@/lib/semaforo/zonas"
import { createClient } from "@/lib/supabase/server"

import SemaforoPage from "./page"

vi.mock("@/lib/auth/session", () => ({ getAuthUser: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/semaforo/leer", () => ({ leerSemaforo: vi.fn() }))
vi.mock("@/lib/semaforo/zonas", () => ({ leerZonasActivas: vi.fn() }))
vi.mock("@/components/cambiar-zona", () => ({ CambiarZona: () => <div>Cambiar zona (simulado)</div> }))
vi.mock("@/components/zona-selector", () => ({ ZonaSelector: () => <div>Selector (simulado)</div> }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))

const ZONA = { id: "z1", nombre: "Saposoa" }
const riesgo = (extra: Record<string, unknown> = {}) => ({
  fecha: "2026-11-22",
  nivel: "favorable",
  indice: 0.62,
  motivo: "Frase de riesgo_diario.",
  detalle: null,
  ...extra,
})

beforeEach(() => {
  // Solo se simula Date: 18:00Z del 23-nov = 13:00 en Lima, después de las 12:00 (dato de ayer vencido).
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-23T18:00:00Z"))
  vi.mocked(getAuthUser).mockReset().mockResolvedValue({ id: "u1" })
  vi.mocked(createClient).mockReset().mockResolvedValue({} as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(leerZonasActivas).mockReset().mockResolvedValue([ZONA])
  vi.mocked(leerSemaforo).mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("/semaforo con dato vencido", () => {
  it("muestra «Dato del …» y debajo «Calculado hace 31 horas» a partir de calculado_en", async () => {
    vi.mocked(leerSemaforo).mockResolvedValue({
      error: false,
      zona: ZONA,
      riesgo: riesgo({ calculadoEn: "2026-11-22T10:59:00.123456+00:00" }),
    })

    render(await SemaforoPage())

    const fecha = screen.getByText("Dato del 22 de noviembre")
    expect(fecha.nextElementSibling).toHaveTextContent("Calculado hace 31 horas")
  })

  it("si la fila no trae calculado_en, no hay línea de antigüedad y el resto sigue igual", async () => {
    vi.mocked(leerSemaforo).mockResolvedValue({ error: false, zona: ZONA, riesgo: riesgo() })

    render(await SemaforoPage())

    expect(screen.getByText("Dato del 22 de noviembre")).toBeInTheDocument()
    expect(screen.queryByText(/Calculado hace/)).not.toBeInTheDocument()
    expect(screen.getByText("Cambiar zona (simulado)")).toBeInTheDocument()
  })

  it("con el dato del día no aparece la línea, aunque exista calculado_en", async () => {
    vi.mocked(leerSemaforo).mockResolvedValue({
      error: false,
      zona: ZONA,
      riesgo: riesgo({ fecha: "2026-11-23", calculadoEn: "2026-11-23T11:00:00Z" }),
    })

    render(await SemaforoPage())

    expect(screen.getByText("Estimación del 23 de noviembre")).toBeInTheDocument()
    expect(screen.queryByText(/Calculado hace/)).not.toBeInTheDocument()
  })
})
