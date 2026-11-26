#!/usr/bin/env node
/**
 * Crea los planes recurrentes en Culqi y muestra los IDs para .env.
 * Uso: pnpm culqi:plans
 * Requiere CULQI_SECRET_KEY en .env
 */
import { readFileSync, appendFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnv(path) {
  const vals = {}
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      vals[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch {
    // ignore
  }
  return vals
}

const env = { ...loadEnv(resolve(".env")), ...process.env }
const secret = env.CULQI_SECRET_KEY?.trim()
if (!secret) {
  console.error("Falta CULQI_SECRET_KEY en .env. Cópiala desde CulqiPanel → Desarrollo → API Keys.")
  process.exit(1)
}

const plans = [
  {
    envKey: "CULQI_PLAN_PREMIUM_ID",
    body: {
      name: "Café Guardián Premium",
      short_name: "cg-premium-mensual",
      description: "Fotos ilimitadas y historial por parcela. Cobro mensual.",
      amount: 1200,
      currency: "PEN",
      interval_unit_time: 3,
      interval_count: 1,
      initial_cycles: {
        count: 0,
        has_initial_charge: false,
        amount: 0,
        interval_unit_time: 3,
      },
      metadata: { codigo: "premium_mensual", app: "cafe-guardian" },
    },
  },
]

const existingPremium = env.CULQI_PLAN_PREMIUM_ID?.trim()
if (existingPremium) {
  console.log(`CULQI_PLAN_PREMIUM_ID ya existe: ${existingPremium}`)
  console.log("Si quieres recrearlo, bórralo del .env y vuelve a correr este script.")
  process.exit(0)
}

for (const plan of plans) {
  console.log(`Creando plan Culqi: ${plan.body.name} …`)
  const response = await fetch("https://api.culqi.com/v2/recurrent/plans/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan.body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.id) {
    console.error("Culqi rechazó la creación del plan:", payload)
    process.exit(1)
  }
  console.log(`OK → ${plan.envKey}=${payload.id}`)
  const line = `\n${plan.envKey}=${payload.id}\n`
  appendFileSync(resolve(".env"), line, "utf8")
  console.log(`Guardado en .env`)
}

console.log("Planes Culqi listos. Reinicia `pnpm dev` para cargar las variables.")
