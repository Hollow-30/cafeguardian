// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveCierreAviso, type AvisoVisible } from "@/lib/semaforo/aviso"
import { NIVELES_PRESENTACION, TEXTOS_AVISO, TEXTOS_SEMAFORO } from "@/lib/semaforo/presentacion"

import { AvisoSemaforo } from "./aviso-semaforo"

const DIA = "2026-11-11"

const franja: AvisoVisible = { tipo: "franja", dia: DIA, zona: "Saposoa", nivel: "poco_favorable", esDeAyer: false }
const amarillo: AvisoVisible = { tipo: "bloque", dia: DIA, zona: "Saposoa", nivel: "favorable", esDeAyer: false }
const rojo: AvisoVisible = { tipo: "bloque", dia: DIA, zona: "Saposoa", nivel: "muy_favorable", esDeAyer: false }
const invitacion: AvisoVisible = { tipo: "invitacion", dia: DIA }

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const segmentos = (contenedor: HTMLElement, estado: "lleno" | "vacio") =>
  contenedor.querySelectorAll(`[data-segmento="${estado}"]`).length

describe("AvisoSemaforo: franja verde (poco favorable)", () => {
  it("una línea con el nivel, qué hacer y enlace a /semaforo", () => {
    const p = NIVELES_PRESENTACION.poco_favorable
    const { container } = render(<AvisoSemaforo decision={franja} />)

    const enlace = screen.getByRole("link", { name: new RegExp(TEXTOS_AVISO.franjaTitulo(p.etiqueta)) })
    expect(enlace).toHaveAttribute("href", "/semaforo")
    expect(enlace).toHaveTextContent(p.queHacer)
    expect(enlace).toHaveTextContent(TEXTOS_AVISO.verSemaforo)
    expect(container.querySelector("svg[aria-hidden='true']")).toBeInTheDocument()
    expect(screen.queryByText(TEXTOS_SEMAFORO.estimacion("Saposoa"))).not.toBeInTheDocument()
  })

  it("usa los colores del nivel con borde de 1.5 px", () => {
    const { colores } = NIVELES_PRESENTACION.poco_favorable
    const { container } = render(<AvisoSemaforo decision={franja} />)
    const caja = container.querySelector("[role='status'] > div") as HTMLElement
    expect(caja).toHaveStyle({ backgroundColor: colores.fondo, borderColor: colores.borde, borderWidth: "1.5px" })
  })

  it("muestra la nota de las 6 a. m. solo con el dato de ayer", () => {
    const { unmount } = render(<AvisoSemaforo decision={franja} />)
    expect(screen.queryByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).not.toBeInTheDocument()
    unmount()
    render(<AvisoSemaforo decision={{ ...franja, esDeAyer: true }} />)
    expect(screen.getByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).toBeInTheDocument()
  })
})

describe("AvisoSemaforo: bloques amarillo y rojo", () => {
  it.each([
    [amarillo, "favorable", 2, "2px"],
    [rojo, "muy_favorable", 3, "2.5px"],
  ] as const)("%# nivel %s: etiqueta, nivel, barra, qué hacer, botón y nota", (decision, nivel, llenos, borde) => {
    const p = NIVELES_PRESENTACION[nivel]
    const { container } = render(<AvisoSemaforo decision={decision} />)

    expect(screen.getByText(TEXTOS_AVISO.etiquetaBloque("Saposoa"))).toBeInTheDocument()
    expect(screen.getByText(p.etiqueta, { exact: false })).toHaveTextContent(`${TEXTOS_SEMAFORO.nivel}: ${p.etiqueta}`)
    expect(screen.getByText(TEXTOS_SEMAFORO.queHacer)).toBeInTheDocument()
    expect(screen.getByText(p.queHacer)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: TEXTOS_AVISO.verSemaforoCompleto })).toHaveAttribute("href", "/semaforo")
    expect(screen.getByText(TEXTOS_SEMAFORO.estimacion("Saposoa"))).toBeInTheDocument()
    expect(segmentos(container, "lleno")).toBe(llenos)
    expect(segmentos(container, "vacio")).toBe(3 - llenos)

    const caja = container.querySelector("[role='status'] > div") as HTMLElement
    expect(caja).toHaveStyle({ backgroundColor: p.colores.fondo, borderColor: p.colores.borde, borderWidth: borde })
  })

  it("cada nivel usa un icono distinto (no depende solo del color)", () => {
    const formas = [franja, amarillo, rojo].map((decision) => {
      const { container, unmount } = render(<AvisoSemaforo decision={decision} />)
      // El icono del nivel es el primer svg que no está dentro de un botón (el de la X).
      const icono = Array.from(container.querySelectorAll("svg[aria-hidden='true']")).find((svg) => !svg.closest("button"))
      const forma = icono?.innerHTML
      unmount()
      return forma
    })
    expect(new Set(formas).size).toBe(3)
  })

  it("el botón mide al menos 48 px y la nota de ayer aparece solo con el dato de ayer", () => {
    const { unmount } = render(<AvisoSemaforo decision={amarillo} />)
    expect(screen.getByRole("link", { name: TEXTOS_AVISO.verSemaforoCompleto })).toHaveClass("cg-button-small")
    expect(screen.queryByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).not.toBeInTheDocument()
    unmount()
    render(<AvisoSemaforo decision={{ ...amarillo, esDeAyer: true }} />)
    expect(screen.getByText(TEXTOS_SEMAFORO.notaDatoDeAyer)).toBeInTheDocument()
  })
})

describe("AvisoSemaforo: invitación sin zona", () => {
  it("invita a elegir la zona y lleva a /semaforo", () => {
    const { container } = render(<AvisoSemaforo decision={invitacion} />)

    expect(screen.getByText(TEXTOS_AVISO.invitacionEtiqueta)).toBeInTheDocument()
    expect(screen.getByText(TEXTOS_AVISO.invitacionTitulo)).toBeInTheDocument()
    expect(screen.getByText(TEXTOS_AVISO.invitacionDescripcion)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: TEXTOS_AVISO.invitacionBoton })).toHaveAttribute("href", "/semaforo")
    const caja = container.querySelector("[role='status'] > div") as HTMLElement
    expect(caja).toHaveStyle({ backgroundColor: "#fbf3ec", borderColor: "#c9a98f", borderWidth: "1.5px" })
  })
})

describe("AvisoSemaforo: accesibilidad", () => {
  it.each([franja, amarillo, rojo, invitacion])("%# role=status con nombre y X de 44 px", (decision) => {
    render(<AvisoSemaforo decision={decision} />)

    expect(screen.getByRole("status", { name: TEXTOS_SEMAFORO.titulo })).toBeInTheDocument()
    const cerrar = screen.getByRole("button", { name: "Cerrar aviso" })
    expect(cerrar).toHaveClass("size-11")
  })

  it.each([franja, amarillo, rojo, invitacion])("%# no usa «probabilidad» ni «diagnóstico»", (decision) => {
    const { container } = render(<AvisoSemaforo decision={{ ...decision, ...(decision.tipo !== "invitacion" && { esDeAyer: true }) }} />)
    expect(container.textContent).not.toMatch(/probabilidad|diagn[oó]stic/i)
  })
})

describe("AvisoSemaforo: cerrar con la X", () => {
  it.each([franja, amarillo, rojo, invitacion])("%# guarda el día de Lima y deja la franja con «Ver semáforo»", (decision) => {
    // Una clave de un día anterior se limpia al guardar.
    window.localStorage.setItem(claveCierreAviso("2026-11-10"), "1")
    render(<AvisoSemaforo decision={decision} />)

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }))

    expect(screen.queryByRole("button", { name: "Cerrar aviso" })).not.toBeInTheDocument()
    const enlace = screen.getByRole("link", { name: TEXTOS_AVISO.verSemaforo })
    expect(enlace).toHaveAttribute("href", "/semaforo")
    expect(enlace).toHaveFocus()
    expect(screen.getByText(TEXTOS_AVISO.cerradoTitulo)).toBeInTheDocument()
    expect(screen.getByRole("status", { name: TEXTOS_SEMAFORO.titulo })).toBeInTheDocument()
    expect(window.localStorage.getItem(claveCierreAviso(DIA))).toBe("1")
    expect(window.localStorage.getItem(claveCierreAviso("2026-11-10"))).toBeNull()
    expect(window.localStorage.length).toBe(1)
  })

  it("si ya se cerró ese día, al abrir queda la franja y no el aviso completo", () => {
    window.localStorage.setItem(claveCierreAviso(DIA), "1")
    render(<AvisoSemaforo decision={rojo} />)

    expect(screen.getByText(TEXTOS_AVISO.cerradoTitulo)).toBeInTheDocument()
    expect(screen.queryByText(TEXTOS_AVISO.etiquetaBloque("Saposoa"))).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cerrar aviso" })).not.toBeInTheDocument()
  })

  it("un cierre de otro día no oculta el aviso de hoy", () => {
    window.localStorage.setItem(claveCierreAviso("2026-11-10"), "1")
    render(<AvisoSemaforo decision={rojo} />)

    expect(screen.getByText(TEXTOS_AVISO.etiquetaBloque("Saposoa"))).toBeInTheDocument()
  })

  it("lo guardado no incluye zona, nivel ni usuario", () => {
    render(<AvisoSemaforo decision={rojo} />)
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }))

    const [clave] = Object.keys(window.localStorage)
    expect(clave).toBe(claveCierreAviso(DIA))
    expect(`${clave}=${window.localStorage.getItem(clave)}`).not.toMatch(/saposoa|favorable/i)
  })
})

describe("AvisoSemaforo: si localStorage falla", () => {
  it("al leer: el aviso se muestra completo", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    render(<AvisoSemaforo decision={amarillo} />)

    expect(screen.getByText(TEXTOS_AVISO.etiquetaBloque("Saposoa"))).toBeInTheDocument()
  })

  it("al guardar: no rompe, cierra en pantalla y deja el acceso", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cuota llena")
    })
    render(<AvisoSemaforo decision={amarillo} />)

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }))

    expect(screen.getByRole("link", { name: TEXTOS_AVISO.verSemaforo })).toHaveAttribute("href", "/semaforo")
    expect(window.localStorage.length).toBe(0)
  })
})
