// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { NivelRiesgo } from "@/lib/risk/types"
import { CREDITO_CLIMA, NIVELES_PRESENTACION, TEXTOS_SEMAFORO } from "@/lib/semaforo/presentacion"
import type { RiesgoValido } from "@/lib/semaforo/estado"

import { SemaforoCard, type EstadoDeTarjeta } from "./semaforo-card"

afterEach(cleanup)

const zona = { id: "z1", nombre: "Saposoa" }
const MOTIVO = "Hubo 7 horas seguidas con hoja húmeda (estimada) y temperatura favorable."

const riesgo = (nivel: NivelRiesgo, indice: number): RiesgoValido => ({
  fecha: "2026-11-11",
  nivel,
  indice,
  motivo: MOTIVO,
  detalle: { rachaMaxima: 7 },
})

const niveles: Array<[NivelRiesgo, number]> = [
  ["poco_favorable", 0.2],
  ["favorable", 0.62],
  ["muy_favorable", 0.9],
]

describe("SemaforoCard con dato", () => {
  it.each(niveles)("nivel %s: texto, icono, color, barra, qué hacer y motivo tal cual", (nivel, indice) => {
    const p = NIVELES_PRESENTACION[nivel]
    const { container } = render(
      <SemaforoCard estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo(nivel, indice), esDeAyer: false }} />,
    )

    // Nivel en texto (no solo color), con el prefijo accesible.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(`${TEXTOS_SEMAFORO.nivel}: ${p.etiqueta}`)
    // Color en hexadecimal desde presentacion.ts.
    const caja = container.querySelector("div.border-2") as HTMLElement
    expect(caja).toHaveStyle({ backgroundColor: p.colores.fondo, borderColor: p.colores.borde })
    // Icono propio de cada nivel, oculto para lectores de pantalla.
    expect(container.querySelector("svg[aria-hidden='true']")).toBeInTheDocument()
    // Barra con el índice.
    const barra = screen.getByRole("progressbar", { name: TEXTOS_SEMAFORO.indice })
    expect(barra).toHaveAttribute("aria-valuenow", String(Math.round(indice * 100)))
    // Qué hacer y motivo sin cambios.
    expect(screen.getByText(p.queHacer)).toBeInTheDocument()
    expect(screen.getByText(MOTIVO)).toBeInTheDocument()
    // Fecha, aviso de estimación y crédito.
    expect(screen.getByText(TEXTOS_SEMAFORO.datoDelDia("11 de noviembre"))).toBeInTheDocument()
    expect(screen.getByText(TEXTOS_SEMAFORO.estimacion("Saposoa"))).toBeInTheDocument()
    expect(screen.getByRole("link", { name: CREDITO_CLIMA.texto })).toHaveAttribute("href", CREDITO_CLIMA.url)
    expect(screen.getByRole("link", { name: CREDITO_CLIMA.licencia })).toHaveAttribute(
      "href",
      CREDITO_CLIMA.urlLicencia,
    )
  })

  it("cada nivel usa un icono distinto", () => {
    const formas = niveles.map(([nivel, indice]) => {
      const { container, unmount } = render(
        <SemaforoCard estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo(nivel, indice), esDeAyer: false }} />,
      )
      const forma = container.querySelector("svg[aria-hidden='true']")?.innerHTML
      unmount()
      return forma
    })
    expect(new Set(formas).size).toBe(3)
  })

  it("dato de ayer tolerado: muestra la nota de las 6 a. m.", () => {
    render(
      <SemaforoCard
        estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo("favorable", 0.62), esDeAyer: true }}
      />,
    )

    expect(screen.getByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).toBeInTheDocument()
  })

  it("dato de hoy: no muestra la nota de ayer", () => {
    render(
      <SemaforoCard
        estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo("favorable", 0.62), esDeAyer: false }}
      />,
    )

    expect(screen.queryByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).not.toBeInTheDocument()
  })

  it("dato vencido: dice «Dato del …» y no la nota de ayer", () => {
    render(
      <SemaforoCard
        estado={{ tipo: "dato_vencido", zona, riesgo: riesgo("muy_favorable", 0.9), diasAtraso: 3 }}
      />,
    )

    expect(screen.getByText(TEXTOS_SEMAFORO.datoVencido("11 de noviembre"))).toBeInTheDocument()
    expect(screen.queryByText(TEXTOS_SEMAFORO.datoDelDia("11 de noviembre"))).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).not.toBeInTheDocument()
    expect(screen.getByText(TEXTOS_SEMAFORO.estimacion("Saposoa"))).toBeInTheDocument()
  })

  it("el índice se limita a 0–100 aunque la base traiga un valor raro", () => {
    render(
      <SemaforoCard estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo("muy_favorable", 1.4), esDeAyer: false }} />,
    )

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it("no usa «probabilidad» ni «diagnóstico»", () => {
    const { container } = render(
      <SemaforoCard estado={{ tipo: "dato_de_hoy", zona, riesgo: riesgo("favorable", 0.62), esDeAyer: false }} />,
    )

    expect(container.textContent).not.toMatch(/probabilidad|diagn[oó]stic/i)
  })
})

describe("SemaforoCard: antigüedad del dato vencido", () => {
  // 18:00Z = 13:00 en Lima: 31 horas después de las 11:00Z del 22-nov (06:00 en Lima).
  const AHORA = new Date("2026-11-23T18:00:00Z")
  const vencido = (calculadoEn?: string | null): EstadoDeTarjeta => ({
    tipo: "dato_vencido",
    zona,
    riesgo: { ...riesgo("favorable", 0.62), fecha: "2026-11-22", ...(calculadoEn === undefined ? {} : { calculadoEn }) },
    diasAtraso: 1,
  })

  it("dato vencido: «Calculado hace 31 horas» justo debajo de «Dato del …»", () => {
    render(<SemaforoCard estado={vencido("2026-11-22T11:00:00+00:00")} ahora={AHORA} />)

    const fecha = screen.getByText(TEXTOS_SEMAFORO.datoVencido("22 de noviembre"))
    const antiguedad = screen.getByText("Calculado hace 31 horas")
    expect(fecha.nextElementSibling).toBe(antiguedad)
  })

  it("dato vencido de varios días: lo dice en días", () => {
    render(<SemaforoCard estado={vencido("2026-11-20T18:00:00Z")} ahora={AHORA} />)

    expect(screen.getByText("Calculado hace 3 días")).toBeInTheDocument()
  })

  it("es texto normal, legible por lectores de pantalla y con el estilo secundario de la nota de ayer", () => {
    render(<SemaforoCard estado={vencido("2026-11-22T11:00:00Z")} ahora={AHORA} />)

    const antiguedad = screen.getByText("Calculado hace 31 horas")
    expect(antiguedad).toHaveClass("text-sm", "text-coffee-700")
    expect(antiguedad.closest("[aria-hidden='true']")).toBeNull()
    expect(antiguedad.textContent).not.toMatch(/\bhoy\b|probabilidad|diagn[oó]stic/i)
  })

  it("sin pasar `ahora` usa la hora actual", () => {
    render(<SemaforoCard estado={vencido("2020-01-01T00:00:00Z")} />)

    expect(screen.getByText(/^Calculado hace \d+ días$/)).toBeInTheDocument()
  })

  it.each([
    ["nulo", null],
    ["ausente", undefined],
    ["inválido", "no es una fecha"],
    ["futuro", "2026-11-25T00:00:00Z"],
  ])("dato vencido con calculadoEn %s: no muestra la línea", (_nombre, calculadoEn) => {
    render(<SemaforoCard estado={vencido(calculadoEn)} ahora={AHORA} />)

    expect(screen.getByText(TEXTOS_SEMAFORO.datoVencido("22 de noviembre"))).toBeInTheDocument()
    expect(screen.queryByText(/Calculado hace/)).not.toBeInTheDocument()
  })

  it.each([false, true])("dato de hoy (esDeAyer: %s): no muestra la línea aunque traiga calculadoEn", (esDeAyer) => {
    const estado: EstadoDeTarjeta = {
      tipo: "dato_de_hoy",
      zona,
      riesgo: { ...riesgo("favorable", 0.62), calculadoEn: "2026-11-22T11:00:00Z" },
      esDeAyer,
    }
    render(<SemaforoCard estado={estado} ahora={AHORA} />)

    expect(screen.queryByText(/Calculado hace/)).not.toBeInTheDocument()
  })

  it("zona sin dato: no muestra la línea", () => {
    render(<SemaforoCard estado={{ tipo: "zona_sin_dato", zona }} ahora={AHORA} />)

    expect(screen.queryByText(/Calculado hace/)).not.toBeInTheDocument()
  })
})

describe("SemaforoCard sin dato", () => {
  const estado: EstadoDeTarjeta = { tipo: "zona_sin_dato", zona }

  it("dice que todavía no hay estimación para la zona, sin nivel ni barra", () => {
    render(<SemaforoCard estado={estado} />)

    expect(screen.getByText(TEXTOS_SEMAFORO.sinDato("Saposoa"))).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })

  it("mantiene el crédito de Open-Meteo", () => {
    render(<SemaforoCard estado={estado} />)

    expect(screen.getByRole("link", { name: CREDITO_CLIMA.texto })).toHaveAttribute("href", CREDITO_CLIMA.url)
  })
})
