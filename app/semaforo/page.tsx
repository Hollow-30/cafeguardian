import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { CambiarZona } from "@/components/cambiar-zona"
import { SemaforoCard } from "@/components/semaforo-card"
import { ZonaSelector } from "@/components/zona-selector"
import { getAuthUser } from "@/lib/auth/session"
import { estadoSemaforo } from "@/lib/semaforo/estado"
import { leerSemaforo } from "@/lib/semaforo/leer"
import { TEXTOS_SEMAFORO, TEXTOS_ZONA } from "@/lib/semaforo/presentacion"
import { leerZonasActivas } from "@/lib/semaforo/zonas"
import { createClient } from "@/lib/supabase/server"

function Marco({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-coffee-950 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="cg-display text-3xl sm:text-4xl">{TEXTOS_SEMAFORO.titulo}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}

export default async function SemaforoPage() {
  const user = await getAuthUser()
  if (!user?.id) redirect("/login?next=/semaforo")

  // Lectura con la sesión del usuario (RLS), sin service role.
  const supabase = await createClient()
  const [lectura, zonas] = await Promise.all([leerSemaforo(supabase, user.id), leerZonasActivas(supabase)])
  const ahora = new Date()
  const estado = estadoSemaforo({ lectura, ahora })

  // Si no se pudo leer el semáforo o la lista de zonas, se muestra el estado de error.
  if (estado.tipo === "error_lectura" || zonas === null) {
    return (
      <Marco>
        <p role="alert" className="rounded-2xl border border-coffee-200 bg-coffee-50 p-5 text-base font-semibold">
          {TEXTOS_SEMAFORO.errorLectura}
        </p>
        <a href="/semaforo" className="cg-text-link mt-3 underline">
          {TEXTOS_SEMAFORO.reintentar}
        </a>
      </Marco>
    )
  }

  if (estado.tipo === "sin_zona") {
    return (
      <Marco>
        <p className="mb-4 text-lg font-semibold">{TEXTOS_SEMAFORO.sinZona}</p>
        {zonas.length > 0 ? <ZonaSelector zonas={zonas} /> : <p className="text-coffee-700">{TEXTOS_ZONA.sinZonas}</p>}
      </Marco>
    )
  }

  // Aquí solo quedan zona_sin_dato, dato_de_hoy y dato_vencido; todos tienen zona.
  if (estado.tipo === "cargando") return null

  return (
    <Marco>
      <SemaforoCard estado={estado} ahora={ahora} />
      {zonas.length > 0 && <CambiarZona zonas={zonas} zonaActualId={estado.zona.id} />}
    </Marco>
  )
}
