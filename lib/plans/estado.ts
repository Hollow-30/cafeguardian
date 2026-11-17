import { freePhotoQuota } from "@/content/pricing"
import { getPlanStatus, photosRemaining, type PlanStatus, type PlanUser } from "@/lib/plans"
import {
  pickActiveSubscription,
  planUserFromSubscription,
  startOfMonthLima,
  type SubscriptionRow,
} from "./resolve"

export type PlanEstadoResponse = {
  user: PlanUser
  status: PlanStatus
  remaining: number | null
  quota: number
}

type PlanJoin = { codigo: string } | { codigo: string }[] | null

function planCodigo(planes: PlanJoin): string | null {
  if (!planes) return null
  return Array.isArray(planes) ? planes[0]?.codigo ?? null : planes.codigo
}

// Cliente Supabase tipado de forma laxa: solo usamos from/select/eq/gte/order.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

export async function countFotosDelMes(supabase: Db, profileId: string, now: Date = new Date()): Promise<number> {
  const { count, error } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("created_at", startOfMonthLima(now))

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function loadSubscriptionRows(supabase: Db, profileId: string): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("estado, inicia_en, termina_en, planes(codigo)")
    .eq("profile_id", profileId)
    .order("termina_en", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as Array<{
    estado: string
    inicia_en: string
    termina_en: string
    planes: PlanJoin
  }>).map((row) => ({
    estado: row.estado,
    inicia_en: row.inicia_en,
    termina_en: row.termina_en,
    plan_codigo: planCodigo(row.planes),
  }))
}

export async function buildPlanEstado(
  supabase: Db,
  profileId: string,
  now: Date = new Date(),
): Promise<PlanEstadoResponse> {
  const [photosUsedThisMonth, rows] = await Promise.all([
    countFotosDelMes(supabase, profileId, now),
    loadSubscriptionRows(supabase, profileId),
  ])
  const sub = pickActiveSubscription(rows, now)
  const resolved = planUserFromSubscription(sub, photosUsedThisMonth, now)
  const status = getPlanStatus(resolved, now)
  const user: PlanUser = { ...resolved, plan: status.plan, photosUsedThisMonth }
  return {
    user,
    status,
    remaining: photosRemaining(user),
    quota: freePhotoQuota,
  }
}
