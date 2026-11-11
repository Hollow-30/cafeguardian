import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createAdminClient = vi.fn()
const crearAlmacenSupabase = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }))
vi.mock("@/lib/cron/almacen-supabase", () => ({ crearAlmacenSupabase: (c: unknown) => crearAlmacenSupabase(c) }))

import { GET } from "./route"

const SECRETO = "secreto-de-prueba-123456"

const pedir = (encabezado?: string) =>
  new Request("http://localhost/api/cron/risk", {
    headers: encabezado ? { authorization: encabezado } : {},
  })

const respuestaOpenMeteo = () => {
  const time: string[] = []
  for (const dia of ["2026-11-10", "2026-11-11"]) {
    for (let h = 0; h < 24; h += 1) time.push(`${dia}T${String(h).padStart(2, "0")}:00`)
  }
  return {
    hourly: {
      time,
      temperature_2m: time.map(() => 23),
      relative_humidity_2m: time.map(() => 95),
      precipitation: time.map(() => 0),
    },
  }
}

function almacenFalso() {
  return {
    leerZonasActivas: vi.fn(async () => [{ id: "z1", latitud: -6.935036, longitud: -76.770951, activo: true }]),
    crearCorrida: vi.fn(async () => "run-1"),
    cerrarCorridasInterrumpidas: vi.fn(async () => 0),
    guardarClima: vi.fn(async () => {}),
    guardarRiesgo: vi.fn(async () => {}),
    cerrarCorrida: vi.fn(async () => {}),
  }
}

describe("GET /api/cron/risk", () => {
  let fetchEspia: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createAdminClient.mockReset()
    crearAlmacenSupabase.mockReset()
    vi.stubEnv("CRON_SECRET", SECRETO)
    fetchEspia = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(respuestaOpenMeteo()), { status: 200 }),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("401 sin encabezado, sin tocar la base ni la red", async () => {
    const respuesta = await GET(pedir())
    expect(respuesta.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
    expect(fetchEspia).not.toHaveBeenCalled()
  })

  it("401 con secreto incorrecto", async () => {
    const respuesta = await GET(pedir("Bearer otro-secreto-123456"))
    expect(respuesta.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
    expect(fetchEspia).not.toHaveBeenCalled()
  })

  it("401 si CRON_SECRET no está configurado, aunque llegue un Bearer", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const respuesta = await GET(pedir("Bearer "))
    expect(respuesta.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
    expect(fetchEspia).not.toHaveBeenCalled()
  })

  it("500 genérico si faltan las variables de Supabase, sin escribir ni descargar", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.")
    })
    const respuesta = await GET(pedir(`Bearer ${SECRETO}`))
    expect(respuesta.status).toBe(500)
    expect(await respuesta.json()).toEqual({ error: "Configuración incompleta" })
    expect(crearAlmacenSupabase).not.toHaveBeenCalled()
    expect(fetchEspia).not.toHaveBeenCalled()
  })

  it("camino feliz: descarga, guarda y responde con el contrato", async () => {
    const almacen = almacenFalso()
    createAdminClient.mockReturnValue({})
    crearAlmacenSupabase.mockReturnValue(almacen)

    const respuesta = await GET(pedir(`Bearer ${SECRETO}`))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(cuerpo).toMatchObject({ run_id: "run-1", status: "ok", zones_ok: 1, zones_failed: 0 })
    expect(cuerpo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fetchEspia).toHaveBeenCalledTimes(1)
    expect(almacen.guardarClima).toHaveBeenCalledTimes(1)
    expect(almacen.guardarRiesgo).toHaveBeenCalledTimes(1)
  })

  it("500 si ninguna zona se pudo actualizar, sin filtrar el error interno", async () => {
    const almacen = almacenFalso()
    createAdminClient.mockReturnValue({})
    crearAlmacenSupabase.mockReturnValue(almacen)
    fetchEspia.mockResolvedValue(new Response("{}", { status: 503 }))

    const respuesta = await GET(pedir(`Bearer ${SECRETO}`))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(500)
    expect(cuerpo).toMatchObject({ status: "error", zones_ok: 0, zones_failed: 1 })
    expect(JSON.stringify(cuerpo)).not.toContain("503")
  })
})
