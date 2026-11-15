import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthUser = vi.fn()
const createClient = vi.fn()

vi.mock("@/lib/auth/session", () => ({ getAuthUser: () => getAuthUser() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }))

import { PATCH } from "./route"

const ZONA_ID = "11111111-1111-4111-8111-111111111111"

type Respuesta = { data: unknown; error: { message: string; code?: string } | null }

// Cliente falso: una respuesta por tabla; guarda lo que se intentó actualizar.
function clienteFalso(respuestas: { zonas_clima?: Respuesta; profiles?: Respuesta }) {
  const actualizaciones: Array<{ tabla: string; valores: unknown; filtro: unknown[] }> = []
  const from = (tabla: "zonas_clima" | "profiles") => {
    const registro = { tabla, valores: undefined as unknown, filtro: [] as unknown[] }
    const cadena: Record<string, unknown> = {
      select: () => cadena,
      update: (valores: unknown) => {
        registro.valores = valores
        actualizaciones.push(registro)
        return cadena
      },
      eq: (...args: unknown[]) => {
        registro.filtro = args
        return cadena
      },
      maybeSingle: async () => respuestas[tabla] ?? { data: null, error: null },
    }
    return cadena
  }
  return { cliente: { from }, actualizaciones }
}

const pedir = (cuerpo: unknown) =>
  new Request("http://localhost/api/perfil/zona", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  })

describe("PATCH /api/perfil/zona", () => {
  beforeEach(() => {
    getAuthUser.mockReset()
    createClient.mockReset()
  })

  it("401 sin sesión, sin tocar la base", async () => {
    getAuthUser.mockResolvedValue(null)
    const respuesta = await PATCH(pedir({ zona_clima_id: ZONA_ID }))
    expect(respuesta.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("400 si el cuerpo no es JSON", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    expect((await PATCH(pedir("no es json"))).status).toBe(400)
  })

  it("400 si falta zona_clima_id o no es un uuid", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    expect((await PATCH(pedir({}))).status).toBe(400)
    expect((await PATCH(pedir({ zona_clima_id: "abc" }))).status).toBe(400)
    expect((await PATCH(pedir({ zona_clima_id: null }))).status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("422 si la zona no existe, sin escribir el perfil", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente, actualizaciones } = clienteFalso({ zonas_clima: { data: null, error: null } })
    createClient.mockResolvedValue(cliente)
    expect((await PATCH(pedir({ zona_clima_id: ZONA_ID }))).status).toBe(422)
    expect(actualizaciones).toHaveLength(0)
  })

  it("422 si la zona está inactiva, sin escribir el perfil", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente, actualizaciones } = clienteFalso({
      zonas_clima: { data: { id: ZONA_ID, nombre: "El Dorado", activo: false }, error: null },
    })
    createClient.mockResolvedValue(cliente)
    expect((await PATCH(pedir({ zona_clima_id: ZONA_ID }))).status).toBe(422)
    expect(actualizaciones).toHaveLength(0)
  })

  it("guarda la zona activa en el perfil del usuario con su sesión", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente, actualizaciones } = clienteFalso({
      zonas_clima: { data: { id: ZONA_ID, nombre: "Saposoa", activo: true }, error: null },
      profiles: { data: { zona_clima_id: ZONA_ID }, error: null },
    })
    createClient.mockResolvedValue(cliente)

    const respuesta = await PATCH(pedir({ zona_clima_id: ZONA_ID }))

    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toEqual({ zona_clima_id: ZONA_ID, zona: { id: ZONA_ID, nombre: "Saposoa" } })
    expect(actualizaciones).toEqual([
      { tabla: "profiles", valores: { zona_clima_id: ZONA_ID }, filtro: ["id", "u1"] },
    ])
  })

  it("422 si el trigger de la base rechaza la zona", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente } = clienteFalso({
      zonas_clima: { data: { id: ZONA_ID, nombre: "Saposoa", activo: true }, error: null },
      profiles: { data: null, error: { message: "La zona no existe o no está activa.", code: "23514" } },
    })
    createClient.mockResolvedValue(cliente)
    expect((await PATCH(pedir({ zona_clima_id: ZONA_ID }))).status).toBe(422)
  })

  it("500 genérico si falla la base, sin filtrar el error interno", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente } = clienteFalso({
      zonas_clima: { data: { id: ZONA_ID, nombre: "Saposoa", activo: true }, error: null },
      profiles: { data: null, error: { message: "column zona_clima_id does not exist", code: "42703" } },
    })
    createClient.mockResolvedValue(cliente)
    const respuesta = await PATCH(pedir({ zona_clima_id: ZONA_ID }))
    expect(respuesta.status).toBe(500)
    expect(JSON.stringify(await respuesta.json())).not.toContain("column")
  })

  it("404 si el usuario no tiene perfil", async () => {
    getAuthUser.mockResolvedValue({ id: "u1" })
    const { cliente } = clienteFalso({
      zonas_clima: { data: { id: ZONA_ID, nombre: "Saposoa", activo: true }, error: null },
      profiles: { data: null, error: null },
    })
    createClient.mockResolvedValue(cliente)
    expect((await PATCH(pedir({ zona_clima_id: ZONA_ID }))).status).toBe(404)
  })
})
