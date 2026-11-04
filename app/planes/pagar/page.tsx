import Link from "next/link"

export default function PaymentPage() {
  return <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-[#4A2E1E]"><div className="flex max-w-md flex-col gap-4"><h1 className="text-3xl font-bold">Pago Premium</h1><p>La pantalla de pago estará disponible próximamente.</p><Link href="/planes" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#4A2E1E] px-5 py-3 font-bold text-white">Volver a planes</Link></div></main>
}
