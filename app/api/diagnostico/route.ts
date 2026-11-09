import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/session"
import { parseClassification } from "@/lib/diagnosis/contract"
import { FOTO_ALLOWED_TYPES, FOTO_MAX_BYTES, type FotoAllowedType } from "@/lib/fotos/validation"

export const runtime = "nodejs"
export const maxDuration = 40

class RequestError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function serviceConfig() {
  const token = process.env.INFERENCE_SERVICE_TOKEN
  const url = new URL(process.env.INFERENCE_SERVICE_URL ?? "")
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if (!token || token.length < 32 || url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local))) {
    throw new Error("Configuración de inferencia inválida")
  }
  return { url, token }
}

// The declared length is only an early check; always bound the actual stream.
async function readPhoto(request: Request, signal: AbortSignal) {
  const declared = request.headers.get("content-length")
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > FOTO_MAX_BYTES)) {
    throw new RequestError(413, "La foto supera el límite de 10 MiB.")
  }
  const reader = request.body?.getReader()
  if (!reader) throw new RequestError(422, "La foto está vacía.")
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal.addEventListener("abort", cancel, { once: true })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      size += value.byteLength
      if (size > FOTO_MAX_BYTES) throw new RequestError(413, "La foto supera el límite de 10 MiB.")
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener("abort", cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  if (!size) throw new RequestError(422, "La foto está vacía.")
  return Buffer.concat(chunks, size)
}

export async function POST(request: Request) {
  const started = performance.now()
  const reply = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Server-Timing": `total;dur=${(performance.now() - started).toFixed(2)}` },
  })
  const user = await getAuthUser()
  if (!user?.id) return reply({ error: "No autenticado" }, 401)

  let config: ReturnType<typeof serviceConfig>
  try { config = serviceConfig() } catch { return reply({ error: "Servicio de diagnóstico no configurado." }, 503) }
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? ""
  if (!FOTO_ALLOWED_TYPES.includes(contentType as FotoAllowedType)) {
    return reply({ error: "Usa JPEG, PNG o WebP." }, 415)
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)])
  try {
    const body = await readPhoto(request, signal)
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": contentType, Authorization: `Bearer ${config.token}` },
      body,
      signal,
      cache: "no-store",
      redirect: "error",
    })
    if (!response.ok) {
      await response.body?.cancel()
      const status = [400, 413, 415, 422].includes(response.status) ? response.status : 503
      return reply({ error: status === 503 ? "Servicio de diagnóstico no disponible." : "La imagen no es válida." }, status)
    }
    const result = parseClassification(await response.json())
    if (result.isDemo) throw new Error("Respuesta simulada del servicio real")
    return reply(result)
  } catch (error) {
    if (error instanceof RequestError) return reply({ error: error.message }, error.status)
    if (signal.aborted) return reply({ error: "El análisis excedió el tiempo permitido." }, 504)
    return reply({ error: "No se pudo obtener una predicción válida." }, 502)
  }
}
