import type { HoraClima } from "@/lib/risk/types"

// Open-Meteo es gratis solo para uso no comercial (válido para el MVP académico) y sus datos
// son CC BY 4.0: hay que dar crédito con un enlace junto a donde se muestren.
export const FUENTE_CLIMA = "open-meteo"
export const ZONA_HORARIA = "America/Lima"

const URL_API = "https://api.open-meteo.com/v1/forecast"
// Supuesto a validar: si Open-Meteo tarda más de esto, el punto cuenta como fallido.
const TIEMPO_LIMITE_MS = 20_000

export function construirUrl(latitud: number, longitud: number) {
  const url = new URL(URL_API)
  url.search = new URLSearchParams({
    latitude: String(latitud),
    longitude: String(longitud),
    hourly: "temperature_2m,relative_humidity_2m,precipitation",
    past_days: "1",
    forecast_days: "1",
    timezone: ZONA_HORARIA,
  }).toString()
  return url
}

const aNumero = (valor: unknown) => (typeof valor === "number" && Number.isFinite(valor) ? valor : null)

// Convierte la respuesta en horas locales ("AAAA-MM-DDTHH:00"). Falla si faltan series o no cuadran;
// un valor vacío de una hora se conserva como null (calcularRiesgo lo trata como dato faltante).
export function parsearRespuesta(json: unknown): HoraClima[] {
  const hourly = (json as { hourly?: Record<string, unknown> } | null)?.hourly
  const tiempos = hourly?.time
  const series = [hourly?.temperature_2m, hourly?.relative_humidity_2m, hourly?.precipitation]

  if (
    !Array.isArray(tiempos) ||
    tiempos.length === 0 ||
    tiempos.some((tiempo) => typeof tiempo !== "string") ||
    series.some((serie) => !Array.isArray(serie) || serie.length !== tiempos.length)
  ) {
    throw new Error("Respuesta de Open-Meteo incompleta: faltan series o tienen distinto largo.")
  }

  const [temperaturas, humedades, lluvias] = series as unknown[][]
  return tiempos.map((tiempo: string, i) => ({
    tiempo,
    temperatura: aNumero(temperaturas[i]),
    humedad: aNumero(humedades[i]),
    lluvia: aNumero(lluvias[i]),
  }))
}

export interface OpcionesDescarga {
  fetch?: typeof fetch
  tiempoLimiteMs?: number
}

export async function descargarClima(latitud: number, longitud: number, opciones: OpcionesDescarga = {}) {
  const pedir = opciones.fetch ?? globalThis.fetch
  const respuesta = await pedir(construirUrl(latitud, longitud), {
    redirect: "error",
    signal: AbortSignal.timeout(opciones.tiempoLimiteMs ?? TIEMPO_LIMITE_MS),
  })
  if (!respuesta.ok) {
    throw new Error(`Open-Meteo respondió ${respuesta.status}.`)
  }
  return parsearRespuesta(await respuesta.json())
}
