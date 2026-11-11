import { describe, expect, it } from "vitest"

import { estaAutorizado } from "./autorizacion"

const SECRETO = "secreto-de-prueba-123456"

describe("estaAutorizado", () => {
  it("acepta Bearer con el secreto correcto", () => {
    expect(estaAutorizado(`Bearer ${SECRETO}`, SECRETO)).toBe(true)
  })

  it("rechaza sin encabezado", () => {
    expect(estaAutorizado(null, SECRETO)).toBe(false)
  })

  it("rechaza un secreto incorrecto", () => {
    expect(estaAutorizado("Bearer otro-secreto-123456", SECRETO)).toBe(false)
  })

  it("rechaza un esquema distinto de Bearer", () => {
    expect(estaAutorizado(`Basic ${SECRETO}`, SECRETO)).toBe(false)
    expect(estaAutorizado(SECRETO, SECRETO)).toBe(false)
  })

  it("rechaza todo si CRON_SECRET está vacío o ausente", () => {
    expect(estaAutorizado("Bearer ", "")).toBe(false)
    expect(estaAutorizado("Bearer undefined", undefined)).toBe(false)
  })

  it("rechaza un valor de distinto largo sin fallar", () => {
    expect(estaAutorizado("Bearer x", SECRETO)).toBe(false)
    expect(estaAutorizado(`Bearer ${SECRETO}${SECRETO}`, SECRETO)).toBe(false)
  })
})
