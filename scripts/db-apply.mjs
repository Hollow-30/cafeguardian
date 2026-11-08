#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

function loadEnv(path) {
  const vals = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const i = line.indexOf("=")
    vals[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return vals
}

const mode = process.argv[2]
const files =
  mode === "seed"
    ? ["supabase/seed.sql"]
    : mode === "migrate"
      ? [
          "supabase/migrations/20261102_controlled_superadmin_role.sql",
          "supabase/migrations/20261102_core_data_model.sql",
          "supabase/migrations/20261102_fotos_historial_r2.sql",
          "supabase/migrations/20261107_zonas_clima.sql",
        ]
      : null

if (!files) {
  console.error("Uso: node scripts/db-apply.mjs <migrate|seed>")
  process.exit(1)
}

const env = loadEnv(resolve(".env"))
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL
if (!url) {
  console.error("Falta POSTGRES_URL_NON_POOLING o POSTGRES_URL en .env")
  process.exit(1)
}

for (const file of files) {
  console.log(`Aplicando ${file} ...`)
  const result = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-f", file], {
    encoding: "utf8",
  })
  if (result.stdout) process.stdout.write(result.stdout.replaceAll(url, "[redacted]"))
  if (result.stderr) process.stderr.write(result.stderr.replaceAll(url, "[redacted]"))
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(mode === "seed" ? "Seed aplicado." : "Migraciones aplicadas.")
