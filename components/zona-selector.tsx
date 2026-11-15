"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Check } from "lucide-react"

import { TEXTOS_ZONA } from "@/lib/semaforo/presentacion"
import type { ZonaVista } from "@/lib/semaforo/types"

interface ZonaSelectorProps {
  /** Zonas activas, ya leídas en el servidor. */
  zonas: ZonaVista[]
  zonaActualId?: string | null
  /** Se llama después de guardar y refrescar la página (CambiarZona lo usa para cerrarse). */
  onListo?: () => void
}

// Mensaje según el código de la ruta PATCH /api/perfil/zona. Sin detalles internos.
function mensajeDeError(status: number): string {
  if (status === 401) return TEXTOS_ZONA.errorSesion
  if (status === 422) return TEXTOS_ZONA.errorZona
  return TEXTOS_ZONA.errorGuardar
}

export function ZonaSelector({ zonas, zonaActualId = null, onListo }: ZonaSelectorProps) {
  const router = useRouter()
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  async function elegir(zona: ZonaVista) {
    if (guardandoId) return
    setGuardandoId(zona.id)
    setMensaje(TEXTOS_ZONA.guardando)
    setError("")
    try {
      const respuesta = await fetch("/api/perfil/zona", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zona_clima_id: zona.id }),
      })
      if (!respuesta.ok) {
        setMensaje("")
        setError(mensajeDeError(respuesta.status))
        return
      }
      setMensaje(TEXTOS_ZONA.guardada(zona.nombre))
      router.refresh()
      onListo?.()
    } catch {
      setMensaje("")
      setError(TEXTOS_ZONA.errorGuardar)
    } finally {
      setGuardandoId(null)
    }
  }

  return (
    <section aria-labelledby="zona-selector-titulo" className="rounded-2xl border border-coffee-200 bg-white p-5 sm:p-6">
      <h2 id="zona-selector-titulo" className="text-xl font-semibold text-coffee-950">
        {TEXTOS_ZONA.titulo}
      </h2>
      <p className="mt-2 text-sm leading-6 text-coffee-700">{TEXTOS_ZONA.descripcion}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {zonas.map((zona) => {
          const actual = zona.id === zonaActualId
          return (
            <li key={zona.id}>
              <button
                type="button"
                onClick={() => void elegir(zona)}
                disabled={guardandoId !== null}
                aria-pressed={actual}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base font-semibold transition disabled:opacity-60 ${
                  actual
                    ? "border-coffee-800 bg-coffee-50 text-coffee-950"
                    : "border-coffee-200 text-coffee-900 hover:bg-coffee-50"
                }`}
              >
                <span>{zona.nombre}</span>
                {actual && <Check size={18} aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm text-coffee-800">
        {mensaje}
      </div>
      {error && (
        <p role="alert" className="mt-1 rounded-xl border border-coffee-200 bg-coffee-50 p-3 text-sm font-semibold text-coffee-950">
          {error}
        </p>
      )}
    </section>
  )
}
