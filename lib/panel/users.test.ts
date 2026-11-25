import { describe, expect, it } from "vitest"
import { buildPanelUsuarios, summarizePanelUsuarios } from "./users"

describe("buildPanelUsuarios", () => {
  const now = new Date("2026-11-18T18:00:00.000Z")

  it("lista usuarios con plan activo, correo y fotos", () => {
    const users = buildPanelUsuarios({
      profiles: [
        { id: "a", full_name: "Ana Demo", rol: "caficultor" },
        { id: "b", full_name: "Luis Ensayo", rol: "caficultor" },
      ],
      suscripciones: [
        {
          profile_id: "a",
          estado: "activa",
          termina_en: "2026-12-01",
          planes: { codigo: "prueba_30", nombre: "Plan de prueba 30 días" },
        },
      ],
      fotos: [{ profile_id: "a" }, { profile_id: "a" }, { profile_id: "b" }],
      emailsById: { a: "ana@example.com", b: "luis@example.com" },
      now,
    })

    expect(users).toEqual([
      {
        id: "a",
        full_name: "Ana Demo",
        email: "ana@example.com",
        rol: "caficultor",
        plan_codigo: "prueba_30",
        plan_nombre: "Plan de prueba 30 días",
        suscripcion_estado: "activa",
        termina_en: "2026-12-01",
        fotos_count: 2,
      },
      {
        id: "b",
        full_name: "Luis Ensayo",
        email: "luis@example.com",
        rol: "caficultor",
        plan_codigo: null,
        plan_nombre: null,
        suscripcion_estado: null,
        termina_en: null,
        fotos_count: 1,
      },
    ])
  })

  it("trata suscripciones vencidas como Gratis", () => {
    const users = buildPanelUsuarios({
      profiles: [{ id: "a", full_name: "Ana Demo", rol: "caficultor" }],
      suscripciones: [
        {
          profile_id: "a",
          estado: "vencida",
          termina_en: "2026-12-02",
          planes: { codigo: "prueba_30", nombre: "Plan de prueba 30 días" },
        },
      ],
      fotos: [],
      emailsById: { a: "ana@example.com" },
      now,
    })

    expect(users[0]).toMatchObject({
      plan_codigo: null,
      plan_nombre: null,
      suscripcion_estado: null,
      termina_en: null,
    })
  })
})


describe("summarizePanelUsuarios", () => {
  it("cuenta caficultores y premium activos", () => {
    const resumen = summarizePanelUsuarios([
      {
        id: "a",
        full_name: "Ana",
        email: null,
        rol: "caficultor",
        plan_codigo: "prueba_30",
        plan_nombre: "Premium",
        suscripcion_estado: "activa",
        termina_en: "2026-12-01",
        fotos_count: 1,
      },
      {
        id: "b",
        full_name: "Luis",
        email: null,
        rol: "caficultor",
        plan_codigo: null,
        plan_nombre: null,
        suscripcion_estado: null,
        termina_en: null,
        fotos_count: 0,
      },
      {
        id: "c",
        full_name: "Admin",
        email: null,
        rol: "superadministrador",
        plan_codigo: null,
        plan_nombre: null,
        suscripcion_estado: null,
        termina_en: null,
        fotos_count: 0,
      },
    ])

    expect(resumen).toMatchObject({
      caficultoresActivos: 2,
      premiumActivos: 1,
      gratisOSinPlan: 1,
    })
  })
})
