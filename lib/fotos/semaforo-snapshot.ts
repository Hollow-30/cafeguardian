/** Lee el semáforo actual del usuario para adjuntarlo al guardar una foto. */
export async function fetchSemaforoSnapshot(): Promise<{
  semaforoDia: string | null
  semaforoFecha: string | null
}> {
  try {
    const response = await fetch("/api/semaforo", { credentials: "same-origin", cache: "no-store" })
    if (!response.ok) return { semaforoDia: null, semaforoFecha: null }
    const body = (await response.json().catch(() => ({}))) as {
      riesgo?: { nivel?: string; fecha?: string } | null
    }
    return {
      semaforoDia: body.riesgo?.nivel ?? null,
      semaforoFecha: body.riesgo?.fecha ?? null,
    }
  } catch {
    return { semaforoDia: null, semaforoFecha: null }
  }
}
