import { describe, expect, it } from "vitest"

import { agruparZonasPorPunto } from "./agrupar-zonas"

const zona = (id: string, latitud: number | string, longitud: number | string, activo = true) => ({
  id,
  latitud,
  longitud,
  activo,
})

describe("agruparZonasPorPunto", () => {
  it("tres zonas con el mismo punto dan una sola descarga", () => {
    const puntos = agruparZonasPorPunto([
      zona("c", -6.935036, -76.770951),
      zona("a", -6.935036, -76.770951),
      zona("b", -6.935036, -76.770951),
    ])
    expect(puntos).toEqual([{ latitud: -6.935036, longitud: -76.770951, zonaIds: ["a", "b", "c"] }])
  })

  it("ignora las zonas inactivas", () => {
    const puntos = agruparZonasPorPunto([zona("a", -6.9, -76.7), zona("b", -7.1, -76.9, false)])
    expect(puntos).toHaveLength(1)
    expect(puntos[0].zonaIds).toEqual(["a"])
  })

  it("separa puntos distintos y los ordena igual sin importar la entrada", () => {
    const entrada = [zona("a", -6.9, -76.7), zona("b", -12.0, -77.0)]
    const esperado = agruparZonasPorPunto(entrada)
    expect(agruparZonasPorPunto([...entrada].reverse())).toEqual(esperado)
    expect(esperado.map((punto) => punto.latitud)).toEqual([-12, -6.9])
  })

  it("normaliza coordenadas en texto o número a 6 decimales", () => {
    const puntos = agruparZonasPorPunto([zona("a", "-6.935036", "-76.770951"), zona("b", -6.9350361, -76.7709514)])
    expect(puntos).toHaveLength(1)
    expect(puntos[0].zonaIds).toEqual(["a", "b"])
  })

  it("sin zonas activas devuelve una lista vacía", () => {
    expect(agruparZonasPorPunto([])).toEqual([])
  })
})
