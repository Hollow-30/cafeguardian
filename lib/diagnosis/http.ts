import { parseClassification, type ClassificationProvider } from "./contract"

export const createHttpProvider = (): ClassificationProvider => async (blob) => {
  let response: Response
  try {
    response = await fetch("/api/diagnostico", {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
      signal: AbortSignal.timeout(35_000),
      cache: "no-store",
    })
  } catch {
    throw new Error("No se pudo conectar con el servicio de diagnóstico. Comprueba tu conexión e inténtalo de nuevo.")
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Inicia sesión para analizar la foto.",
      413: "La foto supera el límite permitido.",
      415: "Usa una imagen JPEG, PNG o WebP.",
      422: "No se pudo leer la imagen. Selecciona otra foto.",
      504: "El análisis tardó demasiado. Inténtalo de nuevo.",
    }
    throw new Error(messages[response.status] ?? "El servicio de diagnóstico no está disponible. Inténtalo de nuevo.")
  }
  const result = parseClassification(await response.json())
  if (result.isDemo) throw new Error("El servicio no devolvió una predicción real.")
  return result
}
