"use client"

import { useState } from "react"

import { TEXTOS_ZONA } from "@/lib/semaforo/presentacion"
import type { ZonaVista } from "@/lib/semaforo/types"

import { ZonaSelector } from "./zona-selector"

// Enlace discreto «Cambiar zona» que muestra el selector. Se cierra solo al terminar de guardar.
export function CambiarZona({ zonas, zonaActualId }: { zonas: ZonaVista[]; zonaActualId: string }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls="cambiar-zona-panel"
        className="cg-text-link underline"
      >
        {abierto ? TEXTOS_ZONA.cerrar : TEXTOS_ZONA.cambiar}
      </button>
      <div id="cambiar-zona-panel" hidden={!abierto} className="mt-3">
        {abierto && <ZonaSelector zonas={zonas} zonaActualId={zonaActualId} onListo={() => setAbierto(false)} />}
      </div>
    </div>
  )
}
