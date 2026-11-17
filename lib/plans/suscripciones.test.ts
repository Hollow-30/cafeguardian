import { describe, expect, it, vi } from "vitest"
import {
  addDaysIso,
  activarPremiumPerfil,
  ensurePruebaRegistro,
  expirePastDueSubscriptions,
  vencerPremiumPerfil,
} from "./suscripciones"

describe("addDaysIso", () => {
  it("suma días en calendario", () => {
    expect(addDaysIso("2026-11-17", 30)).toBe("2026-12-17")
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01")
  })
})

describe("expirePastDueSubscriptions", () => {
  it("actualiza activas con termina_en pasado", async () => {
    const select = vi.fn(async () => ({ data: [{ id: "s1" }, { id: "s2" }], error: null }))
    const lt = vi.fn(() => ({ select }))
    const eq = vi.fn(() => ({ lt }))
    const update = vi.fn(() => ({ eq }))
    const supabase = { from: vi.fn(() => ({ update })) }

    await expect(
      expirePastDueSubscriptions(supabase as never, new Date("2026-11-17T18:00:00.000Z")),
    ).resolves.toBe(2)
    expect(supabase.from).toHaveBeenCalledWith("suscripciones")
    expect(eq).toHaveBeenCalledWith("estado", "activa")
    expect(lt).toHaveBeenCalledWith("termina_en", "2026-11-17")
  })
})

describe("vencerPremiumPerfil", () => {
  it("vence activas del perfil", async () => {
    const select = vi.fn(async () => ({ data: [{ id: "s1" }], error: null }))
    const eqEstado = vi.fn(() => ({ select }))
    const eqProfile = vi.fn(() => ({ eq: eqEstado }))
    const update = vi.fn(() => ({ eq: eqProfile }))
    const supabase = { from: vi.fn(() => ({ update })) }

    await expect(vencerPremiumPerfil(supabase as never, "user-1")).resolves.toBe(1)
    expect(eqProfile).toHaveBeenCalledWith("profile_id", "user-1")
    expect(eqEstado).toHaveBeenCalledWith("estado", "activa")
  })
})

describe("ensurePruebaRegistro", () => {
  it("no crea nada si ya hay suscripciones", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: async () => ({ count: 1, error: null }),
        }),
      })),
    }
    await expect(ensurePruebaRegistro(supabase as never, "user-1")).resolves.toBeNull()
  })

  it("crea prueba_30 si el perfil no tiene suscripciones", async () => {
    const planMaybe = vi.fn(async () => ({
      data: { id: "plan-prueba", codigo: "prueba_30", dias_duracion: 30 },
      error: null,
    }))
    const insertSingle = vi.fn(async () => ({
      data: { id: "sub-trial", termina_en: "2026-12-17" },
      error: null,
    }))
    const vencerSelect = vi.fn(async () => ({ data: [], error: null }))
    let suscripcionesCalls = 0

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "suscripciones") {
          suscripcionesCalls += 1
          if (suscripcionesCalls === 1) {
            return {
              select: () => ({
                eq: async () => ({ count: 0, error: null }),
              }),
            }
          }
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({ select: vencerSelect }),
              }),
            }),
            insert: () => ({
              select: () => ({ single: insertSingle }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: planMaybe }),
            }),
          }),
        }
      }),
    }

    await expect(
      ensurePruebaRegistro(supabase as never, "user-1", new Date("2026-11-17T18:00:00.000Z")),
    ).resolves.toEqual({
      suscripcionId: "sub-trial",
      termina_en: "2026-12-17",
      plan_codigo: "prueba_30",
    })
  })
})

describe("activarPremiumPerfil", () => {
  it("crea suscripción tras vencer las previas", async () => {
    const planMaybe = vi.fn(async () => ({
      data: { id: "plan-1", codigo: "basico_anual", dias_duracion: 365 },
      error: null,
    }))
    const insertSingle = vi.fn(async () => ({
      data: { id: "sub-new", termina_en: "2027-11-17" },
      error: null,
    }))
    const vencerSelect = vi.fn(async () => ({ data: [], error: null }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "planes") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: planMaybe }),
              }),
            }),
          }
        }
        // suscripciones: primero update (vencer), luego insert
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({ select: vencerSelect }),
            }),
          }),
          insert: () => ({
            select: () => ({ single: insertSingle }),
          }),
        }
      }),
    }

    await expect(
      activarPremiumPerfil(supabase as never, "user-1", "basico_anual", new Date("2026-11-17T18:00:00.000Z")),
    ).resolves.toEqual({
      suscripcionId: "sub-new",
      termina_en: "2027-11-17",
      plan_codigo: "basico_anual",
    })
  })
})
