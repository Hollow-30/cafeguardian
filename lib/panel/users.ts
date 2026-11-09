export type PanelResumen = {
  ambito: "equipo"
  titulo: string
  caficultoresActivos: number
  diagnosticosHoy: number
  premiumActivos: number
  gratisOSinPlan: number
}

export type PanelUsuario = {
  id: string
  full_name: string
  email: string | null
  rol: string
  plan_codigo: string | null
  plan_nombre: string | null
  suscripcion_estado: string | null
  termina_en: string | null
  fotos_count: number
}

type ProfileRow = { id: string; full_name: string; rol: string }
type SubRow = {
  profile_id: string
  estado: string
  termina_en: string
  planes: { codigo: string; nombre: string } | { codigo: string; nombre: string }[] | null
}
type FotoRow = { profile_id: string }

function planFromSub(planes: SubRow["planes"]) {
  if (!planes) return { codigo: null, nombre: null }
  const plan = Array.isArray(planes) ? planes[0] : planes
  return { codigo: plan?.codigo ?? null, nombre: plan?.nombre ?? null }
}

/** Une perfiles, suscripción activa, correos y conteo de fotos. */
export function buildPanelUsuarios(input: {
  profiles: ProfileRow[]
  suscripciones: SubRow[]
  fotos: FotoRow[]
  emailsById: Record<string, string | null | undefined>
}): PanelUsuario[] {
  const subByProfile = new Map<string, SubRow>()
  for (const sub of input.suscripciones) {
    const current = subByProfile.get(sub.profile_id)
    if (!current || sub.estado === "activa") subByProfile.set(sub.profile_id, sub)
  }

  const fotosCount = new Map<string, number>()
  for (const foto of input.fotos) {
    fotosCount.set(foto.profile_id, (fotosCount.get(foto.profile_id) ?? 0) + 1)
  }

  return input.profiles.map((profile) => {
    const sub = subByProfile.get(profile.id)
    const plan = planFromSub(sub?.planes ?? null)
    return {
      id: profile.id,
      full_name: profile.full_name || "Sin nombre",
      email: input.emailsById[profile.id] ?? null,
      rol: profile.rol,
      plan_codigo: plan.codigo,
      plan_nombre: plan.nombre,
      suscripcion_estado: sub?.estado ?? null,
      termina_en: sub?.termina_en ?? null,
      fotos_count: fotosCount.get(profile.id) ?? 0,
    }
  })
}

export function summarizePanelUsuarios(users: PanelUsuario[]): PanelResumen {
  const caficultores = users.filter((user) => user.rol === "caficultor")
  const premiumActivos = caficultores.filter(
    (user) => user.suscripcion_estado === "activa" && Boolean(user.plan_codigo),
  ).length
  return {
    ambito: "equipo",
    titulo: "Resumen del panel",
    caficultoresActivos: caficultores.length,
    diagnosticosHoy: 0,
    premiumActivos,
    gratisOSinPlan: Math.max(0, caficultores.length - premiumActivos),
  }
}

export function panelResumenWithCounts(input: {
  caficultoresActivos: number
  diagnosticosHoy: number
  premiumActivos: number
  gratisOSinPlan: number
}): PanelResumen {
  return {
    ambito: "equipo",
    titulo: "Resumen del panel",
    caficultoresActivos: input.caficultoresActivos,
    diagnosticosHoy: input.diagnosticosHoy,
    premiumActivos: input.premiumActivos,
    gratisOSinPlan: input.gratisOSinPlan,
  }
}
