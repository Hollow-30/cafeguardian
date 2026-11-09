import type { PanelUsuario } from "@/lib/panel/users"

function planLabel(user: PanelUsuario) {
  if (user.plan_nombre) return user.plan_nombre
  if (user.rol === "superadministrador") return "—"
  return "Sin plan / Gratis"
}

function estadoLabel(user: PanelUsuario) {
  if (user.rol === "superadministrador") return "Equipo"
  if (!user.suscripcion_estado) return "Sin suscripción"
  return user.suscripcion_estado
}

export function PanelUsersTable({ users }: { users: PanelUsuario[] }) {
  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-slate-600">
        Aún no hay perfiles registrados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Usuario</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Vence</th>
            <th className="px-4 py-3 font-semibold">Fotos</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <p className="font-semibold text-emerald-950">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email ?? "Sin correo"}</p>
              </td>
              <td className="px-4 py-3 capitalize text-slate-700">{user.rol}</td>
              <td className="px-4 py-3 text-slate-700">{planLabel(user)}</td>
              <td className="px-4 py-3 capitalize text-slate-700">{estadoLabel(user)}</td>
              <td className="px-4 py-3 text-slate-700">
                {user.termina_en
                  ? new Date(user.termina_en + "T00:00:00").toLocaleDateString("es-PE", {
                      dateStyle: "medium",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 font-semibold text-emerald-950">{user.fotos_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
