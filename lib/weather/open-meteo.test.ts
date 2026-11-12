import { describe, expect, it, vi } from "vitest"

import { construirUrl, descargarClima, parsearRespuesta } from "./open-meteo"

const respuestaValida = () => ({
  hourly: {
    time: ["2026-11-10T00:00", "2026-11-10T01:00"],
    temperature_2m: [23.1, null],
    relative_humidity_2m: [95, 90],
    precipitation: [0.2, 0],
  },
})

const respuestaHttp = (cuerpo: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo }) as Response

describe("construirUrl", () => {
  it("pide 48 horas locales de Lima con las tres variables", () => {
    const url = construirUrl(-6.935036, -76.770951)
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast")
    expect(url.searchParams.get("latitude")).toBe("-6.935036")
    expect(url.searchParams.get("longitude")).toBe("-76.770951")
    expect(url.searchParams.get("hourly")).toBe("temperature_2m,relative_humidity_2m,precipitation")
    expect(url.searchParams.get("past_days")).toBe("1")
    expect(url.searchParams.get("forecast_days")).toBe("1")
    expect(url.searchParams.get("timezone")).toBe("America/Lima")
  })
})

describe("parsearRespuesta", () => {
  it("devuelve horas con los nombres de HoraClima y conserva los null", () => {
    expect(parsearRespuesta(respuestaValida())).toEqual([
      { tiempo: "2026-11-10T00:00", temperatura: 23.1, humedad: 95, lluvia: 0.2 },
      { tiempo: "2026-11-10T01:00", temperatura: null, humedad: 90, lluvia: 0 },
    ])
  })

  it("falla si faltan series o tienen distinto largo", () => {
    expect(() => parsearRespuesta({})).toThrow()
    expect(() => parsearRespuesta(null)).toThrow()
    const corta = respuestaValida()
    corta.hourly.precipitation = [0]
    expect(() => parsearRespuesta(corta)).toThrow(/incompleta/)
  })
})

describe("descargarClima", () => {
  it("descarga y parsea", async () => {
    const pedir = vi.fn(async () => respuestaHttp(respuestaValida()))
    const horas = await descargarClima(-6.9, -76.7, { fetch: pedir as unknown as typeof fetch })
    expect(horas).toHaveLength(2)
    expect(pedir).toHaveBeenCalledTimes(1)
  })

  it("falla si Open-Meteo responde con error HTTP", async () => {
    const pedir = vi.fn(async () => respuestaHttp({}, 429))
    await expect(descargarClima(-6.9, -76.7, { fetch: pedir as unknown as typeof fetch })).rejects.toThrow(/429/)
  })

  it("aborta cuando se pasa el tiempo límite", async () => {
    const pedir = vi.fn(
      (_url: URL | string, init?: RequestInit) =>
        new Promise<Response>((_resolver, rechazar) => {
          init?.signal?.addEventListener("abort", () => rechazar(new Error("abortado")))
        }),
    )
    await expect(
      descargarClima(-6.9, -76.7, { fetch: pedir as unknown as typeof fetch, tiempoLimiteMs: 10 }),
    ).rejects.toThrow()
  })
})
