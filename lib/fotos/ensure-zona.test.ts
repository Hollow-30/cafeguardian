import { describe, expect, it, vi } from "vitest"
import { ensureZonaForUser, normalizeZonaEtiqueta } from "./ensure-zona"

describe("normalizeZonaEtiqueta", () => {
  it.each([
    ["Lote A", "Lote A"],
    ["  Lote A  ", "Lote A"],
    ["", "Sin lote"],
    [null, "Sin lote"],
    [undefined, "Sin lote"],
  ])("normaliza %j → %j", (input, expected) => {
    expect(normalizeZonaEtiqueta(input)).toBe(expected)
  })
})

describe("ensureZonaForUser", () => {
  it("reusa una zona existente con la misma etiqueta", async () => {
    const existing = { id: "zona-1", etiqueta: "Lote A" }
    const insert = vi.fn()
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: existing, error: null }),
            }),
          }),
        }),
        insert,
      })),
    }

    await expect(ensureZonaForUser(supabase as never, "user-1", "Lote A")).resolves.toEqual(existing)
    expect(insert).not.toHaveBeenCalled()
  })

  it("crea la zona si no existe", async () => {
    const created = { id: "zona-2", etiqueta: "Sin lote" }
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: created, error: null }),
      }),
    }))
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        insert,
      })),
    }

    await expect(ensureZonaForUser(supabase as never, "user-1", "  ")).resolves.toEqual(created)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "user-1",
        etiqueta: "Sin lote",
        distrito: "Sin especificar",
      }),
    )
  })
})
