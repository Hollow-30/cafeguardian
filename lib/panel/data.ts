import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildPanelUsuarios,
  panelResumenWithCounts,
  summarizePanelUsuarios,
  type PanelResumen,
  type PanelUsuario,
} from "./users"

async function loadEmailsById(ids: string[]) {
  const emails: Record<string, string | null> = {}
  if (ids.length === 0) return emails

  const admin = createAdminClient()
  const wanted = new Set(ids)
  const perPage = 200
  for (let page = 1; page <= 20 && wanted.size > 0; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    for (const user of data.users) {
      if (wanted.has(user.id)) {
        emails[user.id] = user.email ?? null
        wanted.delete(user.id)
      }
    }
    if (data.users.length < perPage) break
  }
  return emails
}

export async function listPanelUsuarios(): Promise<PanelUsuario[]> {
  const supabase = await createClient()
  const [{ data: profiles, error: profilesError }, { data: suscripciones, error: subsError }, { data: fotos, error: fotosError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, rol").order("created_at", { ascending: true }),
      supabase
        .from("suscripciones")
        .select("profile_id, estado, termina_en, planes(codigo, nombre)")
        .order("created_at", { ascending: false }),
      supabase.from("fotos").select("profile_id"),
    ])

  if (profilesError) throw new Error(profilesError.message)
  if (subsError) throw new Error(subsError.message)
  if (fotosError) throw new Error(fotosError.message)

  const profileRows = profiles ?? []
  const emailsById = await loadEmailsById(profileRows.map((row) => row.id))

  return buildPanelUsuarios({
    profiles: profileRows,
    suscripciones: (suscripciones ?? []) as never,
    fotos: fotos ?? [],
    emailsById,
  })
}

export async function getPanelResumen(): Promise<PanelResumen> {
  const supabase = await createClient()
  const users = await listPanelUsuarios()
  const base = summarizePanelUsuarios(users)

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString())

  if (error) throw new Error(error.message)

  return panelResumenWithCounts({
    caficultoresActivos: base.caficultoresActivos,
    diagnosticosHoy: count ?? 0,
    premiumActivos: base.premiumActivos,
    gratisOSinPlan: base.gratisOSinPlan,
  })
}
