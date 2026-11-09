import { PanelUsersTable } from "@/components/panel-users-table"
import { listPanelUsuarios } from "@/lib/panel/data"

export default async function PanelEquipoPage() {
  const users = await listPanelUsuarios()

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        CAFG-133
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
        Lista de usuarios y plan
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Perfiles registrados con su plan/suscripción actual y cantidad de fotos. Solo visible para
        Superadministrador.
      </p>
      <div className="mt-8">
        <PanelUsersTable users={users} />
      </div>
    </main>
  )
}
