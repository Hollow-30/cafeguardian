import { Soporte } from "@/components/soporte"

export const metadata = {
  title: "Soporte | Café Guardián",
  description: "Canales de soporte para usuarios de Café Guardián.",
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#faf7f4] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Soporte />
      </div>
    </main>
  )
}
