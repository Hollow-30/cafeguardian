import { CircleCheck, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react"

import type { EstadoSemaforo } from "@/lib/semaforo/estado"
import {
  CREDITO_CLIMA,
  TEXTOS_SEMAFORO,
  antiguedadDelDato,
  vistaDelRiesgo,
  type IconoSemaforo,
} from "@/lib/semaforo/presentacion"

export type EstadoDeTarjeta = Extract<EstadoSemaforo, { tipo: "zona_sin_dato" | "dato_de_hoy" | "dato_vencido" }>

// Un icono distinto por nivel: el nivel nunca se distingue solo por el color.
const ICONOS: Record<IconoSemaforo, LucideIcon> = {
  check: CircleCheck,
  alerta: TriangleAlert,
  peligro: OctagonAlert,
}

function CreditoClima() {
  return (
    <p className="mt-5 text-xs leading-5 text-coffee-700">
      <a href={CREDITO_CLIMA.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {CREDITO_CLIMA.texto}
      </a>{" "}
      (
      <a
        href={CREDITO_CLIMA.urlLicencia}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {CREDITO_CLIMA.licencia}
      </a>
      )
    </p>
  )
}

// Los colores del semáforo van en hexadecimal desde presentacion.ts (contraste verificado en pruebas);
// el resto usa la paleta coffee-*. Los textos salen todos de presentacion.ts.
// `ahora` es opcional para poder probar con una hora fija; sin él se usa la hora del servidor
// (la tarjeta no es un componente cliente, así que no hay desfase entre servidor y navegador).
export function SemaforoCard({ estado, ahora = new Date() }: { estado: EstadoDeTarjeta; ahora?: Date }) {
  if (estado.tipo === "zona_sin_dato") {
    return (
      <section aria-labelledby="semaforo-sin-dato" className="rounded-2xl border border-coffee-200 bg-coffee-50 p-5 sm:p-6">
        <p id="semaforo-sin-dato" className="text-base font-semibold text-coffee-950">
          {TEXTOS_SEMAFORO.sinDato(estado.zona.nombre)}
        </p>
        <CreditoClima />
      </section>
    )
  }

  const vista = vistaDelRiesgo(estado.riesgo)
  const { presentacion } = vista
  const Icono = ICONOS[presentacion.icono]
  const fecha =
    estado.tipo === "dato_vencido"
      ? TEXTOS_SEMAFORO.datoVencido(vista.fechaTexto)
      : TEXTOS_SEMAFORO.datoDelDia(vista.fechaTexto)
  // Solo con dato vencido; sin calculado_en válido (o futuro) es null y no se muestra nada.
  const antiguedad = estado.tipo === "dato_vencido" ? antiguedadDelDato(estado.riesgo.calculadoEn, ahora) : null

  return (
    <section aria-labelledby="semaforo-nivel" className="rounded-2xl border border-coffee-200 bg-white p-5 sm:p-6">
      <div
        className="rounded-xl border-2 p-4 sm:p-5"
        style={{
          backgroundColor: presentacion.colores.fondo,
          borderColor: presentacion.colores.borde,
          color: presentacion.colores.texto,
        }}
      >
        <div className="flex items-center gap-3">
          <Icono size={36} strokeWidth={2} aria-hidden="true" style={{ color: presentacion.colores.borde }} />
          <h2 id="semaforo-nivel" className="text-2xl font-bold leading-tight">
            <span className="sr-only">{TEXTOS_SEMAFORO.nivel}: </span>
            {presentacion.etiqueta}
          </h2>
        </div>
        <div
          role="progressbar"
          aria-label={TEXTOS_SEMAFORO.indice}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={vista.indicePorcentaje}
          aria-valuetext={`${vista.indicePorcentaje} %`}
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70"
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${vista.indicePorcentaje}%`, backgroundColor: presentacion.colores.barra }}
          />
        </div>
        <p className="mt-4 text-base leading-7">{vista.motivo}</p>
      </div>

      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-coffee-700">{TEXTOS_SEMAFORO.queHacer}</h3>
      <p className="mt-1 text-lg font-semibold leading-7 text-coffee-950">{presentacion.queHacer}</p>

      <p className="mt-5 text-sm font-semibold text-coffee-900">{fecha}</p>
      {antiguedad && <p className="mt-1 text-sm text-coffee-700">{antiguedad}</p>}
      {estado.tipo === "dato_de_hoy" && estado.esDeAyer && (
        <p className="mt-1 text-sm text-coffee-700">{TEXTOS_SEMAFORO.notaDatoDeAyer}</p>
      )}
      <p className="mt-2 text-sm leading-6 text-coffee-700">{TEXTOS_SEMAFORO.estimacion(estado.zona.nombre)}</p>
      <CreditoClima />
    </section>
  )
}
