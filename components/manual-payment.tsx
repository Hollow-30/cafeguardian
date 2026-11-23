import Link from "next/link"
import { Clock3, FileCheck2, Landmark, Smartphone } from "lucide-react"

export function ManualPayment({ history = false }: { history?: boolean }) {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-coffee-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/planes" className="inline-flex min-h-12 items-center text-sm font-semibold text-coffee-800 underline underline-offset-4">Volver a planes</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-coffee-700">Premium</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{history ? "Mis pagos" : "Pago de suscripción"}</h1>
        <section aria-labelledby="payment-unavailable" className="mt-8 rounded-2xl border border-coffee-200 bg-coffee-50 p-6 sm:p-8">
          <Clock3 className="text-coffee-700" aria-hidden="true" />
          <h2 id="payment-unavailable" className="mt-4 text-xl font-bold">Los pagos aún no están disponibles</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-coffee-900">Estamos preparando el proceso de pago y la consulta de solicitudes. Por ahora no es posible enviar comprobantes ni activar Premium desde aquí.</p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-coffee-900">Si guardaste un comprobante anteriormente en este dispositivo, no se envió para su revisión.</p>
        </section>
        {!history && <>
          <section aria-labelledby="payment-methods" className="mt-10">
            <h2 id="payment-methods" className="text-xl font-bold">Medios de pago previstos</h2>
            <p className="mt-2 text-sm leading-6 text-coffee-700">Los datos para realizar el pago se mostrarán cuando los medios estén habilitados. No realices transferencias todavía.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-coffee-200 p-5"><Smartphone className="text-coffee-700" aria-hidden="true" /><h3 className="mt-3 font-bold">Yape</h3><p className="mt-1 text-sm text-coffee-700">Pendiente de habilitación</p></div>
              <div className="rounded-2xl border border-coffee-200 p-5"><Landmark className="text-coffee-700" aria-hidden="true" /><h3 className="mt-3 font-bold">Transferencia bancaria</h3><p className="mt-1 text-sm text-coffee-700">Pendiente de habilitación</p></div>
            </div>
          </section>
          <section aria-labelledby="payment-next" className="mt-8 rounded-2xl border border-coffee-200 p-6">
            <div className="flex items-center gap-3"><FileCheck2 className="text-coffee-700" aria-hidden="true" /><h2 id="payment-next" className="text-xl font-bold">Comprobante de pago</h2></div>
            <p id="receipt-status" className="mt-3 text-sm leading-6 text-coffee-700">Cuando el servicio esté disponible podrás enviar tu comprobante para su revisión. Tu plan se activará después de validar el pago.</p>
            <button type="button" disabled aria-describedby="receipt-status" className="mt-5 min-h-12 rounded-xl bg-coffee-800 px-5 font-semibold text-white opacity-50">Subir comprobante</button>
          </section>
          <Link href="/mis-pagos" className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-coffee-800 underline underline-offset-4">Ver mis pagos</Link>
        </>}
      </div>
    </main>
  )
}
