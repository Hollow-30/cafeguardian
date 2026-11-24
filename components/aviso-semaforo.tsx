"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react"
import { ChevronRight, CircleCheck, MapPin, OctagonAlert, TriangleAlert, X, type LucideIcon } from "lucide-react"

import { PREFIJO_CLAVE_CIERRE, claveCierreAviso, type AvisoVisible } from "@/lib/semaforo/aviso"
import {
  NIVELES_PRESENTACION,
  TEXTOS_AVISO,
  TEXTOS_SEMAFORO,
  type IconoSemaforo,
} from "@/lib/semaforo/presentacion"
import type { NivelRiesgo } from "@/lib/risk/types"

// Un icono distinto por nivel: el nivel nunca se distingue solo por el color.
const ICONOS: Record<IconoSemaforo, LucideIcon> = {
  check: CircleCheck,
  alerta: TriangleAlert,
  peligro: OctagonAlert,
}

// Segmentos llenos de la barra de 3 (decorativa: el nivel ya va en texto, color e icono).
const SEGMENTOS_LLENOS: Record<NivelRiesgo, number> = { poco_favorable: 1, favorable: 2, muy_favorable: 3 }

// Referencia del mockup para la invitación (no es un color de nivel).
const INVITACION = { fondo: "#fbf3ec", borde: "#c9a98f" }

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2"

// localStorage puede no existir o fallar (modo privado, cuota, bloqueado): nunca rompe la pantalla.
function cierreGuardado(dia: string): boolean {
  try {
    return window.localStorage.getItem(claveCierreAviso(dia)) === "1"
  } catch {
    return false
  }
}

// Guarda "cerrado" solo con el día de Lima y borra las claves de días anteriores.
function guardarCierre(dia: string) {
  try {
    const almacen = window.localStorage
    const actual = claveCierreAviso(dia)
    almacen.setItem(actual, "1")
    for (let i = almacen.length - 1; i >= 0; i--) {
      const clave = almacen.key(i)
      if (clave && clave.startsWith(PREFIJO_CLAVE_CIERRE) && clave !== actual) almacen.removeItem(clave)
    }
  } catch {
    // Si no se puede guardar, el aviso simplemente vuelve a mostrarse la próxima vez.
  }
}

function BotonCerrar({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={TEXTOS_AVISO.cerrar}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10 ${FOCO} ${className}`}
    >
      <X size={20} aria-hidden="true" />
    </button>
  )
}

function Segmentos({ nivel }: { nivel: NivelRiesgo }) {
  const { barra } = NIVELES_PRESENTACION[nivel].colores
  return (
    <div aria-hidden="true" className="flex w-full gap-1.5 md:w-40 md:shrink-0">
      {[1, 2, 3].map((posicion) => {
        const lleno = posicion <= SEGMENTOS_LLENOS[nivel]
        return (
          <span
            key={posicion}
            data-segmento={lleno ? "lleno" : "vacio"}
            className="h-3 flex-1 rounded-full"
            style={{ backgroundColor: lleno ? barra : "rgba(255,255,255,0.7)", boxShadow: `inset 0 0 0 1px ${barra}` }}
          />
        )
      })}
    </div>
  )
}

function Franja({ aviso, alCerrar }: { aviso: Extract<AvisoVisible, { tipo: "franja" }>; alCerrar: () => void }) {
  const p = NIVELES_PRESENTACION[aviso.nivel]
  const Icono = ICONOS[p.icono]
  return (
    <div
      className="flex min-h-14 items-center gap-3 rounded-2xl py-2 pl-3 pr-1"
      style={{
        backgroundColor: p.colores.fondo,
        color: p.colores.texto,
        borderStyle: "solid",
        borderWidth: "1.5px",
        borderColor: p.colores.borde,
      }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: p.colores.borde }}
      >
        <Icono size={20} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <Link href="/semaforo" className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 ${FOCO}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <span className="text-sm font-semibold sm:text-base">{TEXTOS_AVISO.franjaTitulo(p.etiqueta)}</span>
            <span className="text-sm">{p.queHacer}</span>
          </span>
          {aviso.esDeAyer && <span className="mt-0.5 block text-xs">{TEXTOS_SEMAFORO.notaDatoDeAyer}</span>}
        </span>
        <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold underline underline-offset-4 sm:inline-flex">
          {TEXTOS_AVISO.verSemaforo}
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </Link>
      <BotonCerrar onClick={alCerrar} />
    </div>
  )
}

function Bloque({ aviso, alCerrar }: { aviso: Extract<AvisoVisible, { tipo: "bloque" }>; alCerrar: () => void }) {
  const p = NIVELES_PRESENTACION[aviso.nivel]
  const Icono = ICONOS[p.icono]
  const esRojo = aviso.nivel === "muy_favorable"
  const estilo: CSSProperties = {
    backgroundColor: p.colores.fondo,
    color: p.colores.texto,
    borderStyle: "solid",
    borderWidth: esRojo ? "2.5px" : "2px",
    borderColor: p.colores.borde,
  }
  return (
    <div className="relative rounded-2xl p-5 sm:p-6" style={estilo}>
      <BotonCerrar onClick={alCerrar} className="absolute right-1.5 top-1.5" />
      <p className="pr-12 text-xs font-bold tracking-wider">{TEXTOS_AVISO.etiquetaBloque(aviso.zona)}</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-3 md:w-72 md:shrink-0">
          <Icono
            size={esRojo ? 52 : 44}
            strokeWidth={esRojo ? 2.25 : 2}
            aria-hidden="true"
            className="shrink-0"
            style={{ color: p.colores.borde }}
          />
          <p className="cg-display text-3xl sm:text-4xl" style={{ color: p.colores.texto }}>
            <span className="sr-only">{TEXTOS_SEMAFORO.nivel}: </span>
            {p.etiqueta}
          </p>
        </div>
        <Segmentos nivel={aviso.nivel} />
        <div className="md:flex-1">
          <p className="text-xs font-bold uppercase tracking-wide">{TEXTOS_SEMAFORO.queHacer}</p>
          <p className="mt-1 text-base font-semibold leading-6">{p.queHacer}</p>
        </div>
        <Link href="/semaforo" className={`cg-button cg-button-small shrink-0 ${FOCO}`}>
          {TEXTOS_AVISO.verSemaforoCompleto}
        </Link>
      </div>
      {aviso.esDeAyer && <p className="mt-4 text-sm">{TEXTOS_SEMAFORO.notaDatoDeAyer}</p>}
      <p className={`${aviso.esDeAyer ? "mt-1" : "mt-4"} text-sm leading-6`}>{TEXTOS_SEMAFORO.estimacion(aviso.zona)}</p>
    </div>
  )
}

function Invitacion({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div
      className="relative rounded-3xl p-5 sm:p-6"
      style={{
        backgroundColor: INVITACION.fondo,
        borderStyle: "solid",
        borderWidth: "1.5px",
        borderColor: INVITACION.borde,
      }}
    >
      <BotonCerrar onClick={alCerrar} className="absolute right-1.5 top-1.5 text-coffee-900" />
      <p className="pr-12 text-xs font-bold tracking-wider text-coffee-700">{TEXTOS_AVISO.invitacionEtiqueta}</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <MapPin size={30} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-coffee-800" />
          <p className="cg-display text-2xl sm:text-3xl">{TEXTOS_AVISO.invitacionTitulo}</p>
        </div>
        <Link href="/semaforo" className={`cg-button cg-button-small shrink-0 self-start md:self-auto ${FOCO}`}>
          {TEXTOS_AVISO.invitacionBoton}
        </Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-coffee-700">{TEXTOS_AVISO.invitacionDescripcion}</p>
    </div>
  )
}

// Franja neutra de una línea que queda en el mismo lugar tras cerrar: el inicio nunca pierde el acceso.
function FranjaCerrada({ enlaceRef }: { enlaceRef: Ref<HTMLAnchorElement> }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-coffee-200 bg-coffee-50 px-4 text-sm text-coffee-900">
      <span className="font-semibold">{TEXTOS_AVISO.cerradoTitulo}</span>
      <Link
        ref={enlaceRef}
        href="/semaforo"
        className={`inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4 ${FOCO}`}
      >
        {TEXTOS_AVISO.verSemaforo}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}

export function AvisoSemaforo({ decision }: { decision: AvisoVisible }) {
  const { dia } = decision
  // Primer render (servidor y cliente) con el aviso completo; tras montar se lee localStorage.
  // Si el almacenamiento falla, el aviso se queda visible.
  const [cerrado, setCerrado] = useState(false)
  const enlaceCerrado = useRef<HTMLAnchorElement>(null)
  const pasarFoco = useRef(false)

  useEffect(() => {
    setCerrado(cierreGuardado(dia))
  }, [dia])

  // Tras pulsar la X el botón desaparece: el foco pasa al enlace de la franja para quien usa teclado.
  useEffect(() => {
    if (cerrado && pasarFoco.current) {
      pasarFoco.current = false
      enlaceCerrado.current?.focus()
    }
  }, [cerrado])

  function cerrar() {
    pasarFoco.current = true
    guardarCierre(dia)
    setCerrado(true)
  }

  return (
    <div role="status" aria-label={TEXTOS_SEMAFORO.titulo} className="mt-8">
      {cerrado ? (
        <FranjaCerrada enlaceRef={enlaceCerrado} />
      ) : decision.tipo === "invitacion" ? (
        <Invitacion alCerrar={cerrar} />
      ) : decision.tipo === "franja" ? (
        <Franja aviso={decision} alCerrar={cerrar} />
      ) : (
        <Bloque aviso={decision} alCerrar={cerrar} />
      )}
    </div>
  )
}
