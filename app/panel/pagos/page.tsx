import { PanelPagosTable, type PanelPagoItem } from "@/components/panel-pagos-table"
import { rowToPagoPublico } from "@/lib/payments/server"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function PanelPagosPage() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pagos")
    .select(
      "id, profile_id, referencia, monto, metodo, receipt_name, estado, motivo_rechazo, created_at, profiles(full_name)",
    )
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const items: PanelPagoItem[] = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const base = rowToPagoPublico(row as never)
    return {
      ...base,
      profileId: row.profile_id as string,
      fullName: (profile as { full_name?: string } | null)?.full_name ?? "Sin nombre",
    }
  })

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-700">Pagos</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-coffee-950">Comprobantes manuales</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Revisa Yape o transferencias. Al aprobar se activa Premium anual para el caficultor.
      </p>
      <div className="mt-8">
        <PanelPagosTable items={items} />
      </div>
    </main>
  )
}
