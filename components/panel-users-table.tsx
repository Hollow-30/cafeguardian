"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { PanelUsuario } from "@/lib/panel/users"

function planLabel(user: PanelUsuario) {
  if (user.rol === "superadministrador") return "—"
  if (user.suscripcion_estado === "activa" && user.plan_nombre) return user.plan_nombre
  return "Gratis"
}

function estadoLabel(user: PanelUsuario) {
  if (user.rol === "superadministrador") return "Equipo"
  if (user.suscripcion_estado === "activa") return "activa"
  return "Gratis"
}

export function PanelUsersTable({ users }: { users: PanelUsuario[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function runAction(profileId: string, action: "activar" | "vencer", planCodigo?: "basico_anual" | "prueba_30") {
    setBusyId(profileId)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/api/panel/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ profile_id: profileId, action, plan_codigo: planCodigo }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string; termina_en?: string }
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar la suscripción.")
      setMessage(
        action === "activar"
          ? `Premium activado hasta ${body.termina_en ?? "—"}.`
          : "Premium marcado como vencido.",
      )
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al actualizar el plan.")
    } finally {
      setBusyId(null)
    }
  }

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-coffee-200 bg-white p-8 text-center text-sm text-slate-600">
        Aún no hay perfiles registrados.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p role="status" className="rounded-xl border border-coffee-200 bg-coffee-50 p-3 text-sm text-coffee-950">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
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
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const busy = busyId === user.id
              const canManage = user.rol === "caficultor"
              const isActive = user.suscripcion_estado === "activa"
              return (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-coffee-950">{user.full_name}</p>
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
                  <td className="px-4 py-3 font-semibold text-coffee-950">{user.fotos_count}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg bg-coffee-800 px-3 py-2 text-xs font-semibold text-white hover:bg-coffee-900 disabled:opacity-60"
                          onClick={() => void runAction(user.id, "activar", "basico_anual")}
                        >
                          {busy ? "…" : "Activar Premium"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg border border-coffee-300 px-3 py-2 text-xs font-semibold text-coffee-900 hover:bg-coffee-50 disabled:opacity-60"
                          onClick={() => void runAction(user.id, "activar", "prueba_30")}
                        >
                          Trial 30d
                        </button>
                        <button
                          type="button"
                          disabled={busy || !isActive}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => void runAction(user.id, "vencer")}
                        >
                          Vencer
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
