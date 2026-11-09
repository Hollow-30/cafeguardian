type ZonaRow = { id: string; etiqueta: string }

type ZonasClient = {
  from: (table: "zonas") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: ZonaRow | null; error: { message: string } | null }>
        }
      }
    }
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: ZonaRow | null; error: { message: string } | null }>
      }
    }
  }
}

export function normalizeZonaEtiqueta(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed || "Sin lote"
}

/** Busca o crea una zona del usuario por etiqueta (lote). */
export async function ensureZonaForUser(
  supabase: ZonasClient,
  userId: string,
  etiquetaRaw: string | null | undefined,
): Promise<ZonaRow> {
  const etiqueta = normalizeZonaEtiqueta(etiquetaRaw)

  const { data: existing, error: selectError } = await supabase
    .from("zonas")
    .select("id, etiqueta")
    .eq("profile_id", userId)
    .eq("etiqueta", etiqueta)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }
  if (existing) return existing

  const { data: created, error: insertError } = await supabase
    .from("zonas")
    .insert({
      profile_id: userId,
      distrito: "Sin especificar",
      centro_poblado: null,
      etiqueta,
      gps_aproximado: false,
    })
    .select("id, etiqueta")
    .single()

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "No se pudo crear la zona.")
  }

  return created
}
