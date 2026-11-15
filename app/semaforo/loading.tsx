import { TEXTOS_SEMAFORO } from "@/lib/semaforo/presentacion"

// Esqueleto mientras la página lee el semáforo en el servidor.
export default function Loading() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-coffee-950 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="cg-display text-3xl sm:text-4xl">{TEXTOS_SEMAFORO.titulo}</h1>
        <p role="status" className="mt-6 text-coffee-700">
          {TEXTOS_SEMAFORO.cargando}
        </p>
        <div aria-hidden="true" className="mt-4 flex animate-pulse flex-col gap-3 rounded-2xl border border-coffee-100 p-5">
          <div className="h-24 rounded-xl bg-coffee-50" />
          <div className="h-5 w-2/3 rounded bg-coffee-50" />
          <div className="h-4 w-1/2 rounded bg-coffee-50" />
        </div>
      </div>
    </main>
  )
}
