import { todayLima } from "./resolve"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

/** Marca como vencidas las suscripciones activas cuya fecha ya pasó. */
export async function expirePastDueSubscriptions(supabase: Db, now: Date = new Date()): Promise<number> {
  const today = todayLima(now)
  const { data, error } = await supabase
    .from("suscripciones")
    .update({ estado: "vencida" })
    .eq("estado", "activa")
    .lt("termina_en", today)
    .select("id")

  if (error) throw new Error(error.message)
  return (data ?? []).length
}

/** Vence todas las suscripciones activas de un perfil. */
export async function vencerPremiumPerfil(supabase: Db, profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from("suscripciones")
    .update({ estado: "vencida" })
    .eq("profile_id", profileId)
    .eq("estado", "activa")
    .select("id")

  if (error) throw new Error(error.message)
  return (data ?? []).length
}

/**
 * Si el perfil aún no tiene ninguna suscripción, crea la prueba de 30 días.
 * No re-activa a quien ya venció (pasa solo a Gratis).
 */
export async function ensurePruebaRegistro(
  supabase: Db,
  profileId: string,
  now: Date = new Date(),
): Promise<{ suscripcionId: string; termina_en: string; plan_codigo: string } | null> {
  const { count, error } = await supabase
    .from("suscripciones")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)

  if (error) throw new Error(error.message)
  if ((count ?? 0) > 0) return null

  return activarPremiumPerfil(supabase, profileId, "prueba_30", now)
}

/**
 * Activa Premium: cierra activas previas y crea una nueva.
 * Por defecto usa el plan `basico_anual`; `prueba_30` es trial; `premium_mensual` es Culqi S/12.
 */
export async function activarPremiumPerfil(
  supabase: Db,
  profileId: string,
  planCodigo: "basico_anual" | "prueba_30" | "premium_mensual" = "basico_anual",
  now: Date = new Date(),
): Promise<{ suscripcionId: string; termina_en: string; plan_codigo: string }> {
  const { data: plan, error: planError } = await supabase
    .from("planes")
    .select("id, codigo, dias_duracion")
    .eq("codigo", planCodigo)
    .eq("activo", true)
    .maybeSingle()

  if (planError) throw new Error(planError.message)
  if (!plan) throw new Error(`No existe el plan activo ${planCodigo}.`)

  await vencerPremiumPerfil(supabase, profileId)

  const inicia = todayLima(now)
  const termina = addDaysIso(inicia, Number(plan.dias_duracion))

  const { data: created, error: insertError } = await supabase
    .from("suscripciones")
    .insert({
      profile_id: profileId,
      plan_id: plan.id,
      estado: "activa",
      inicia_en: inicia,
      termina_en: termina,
    })
    .select("id, termina_en")
    .single()

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "No se pudo activar Premium.")
  }

  return {
    suscripcionId: created.id,
    termina_en: created.termina_en,
    plan_codigo: plan.codigo,
  }
}
