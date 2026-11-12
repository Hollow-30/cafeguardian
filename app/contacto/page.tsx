import { Mail, Phone } from "lucide-react"

export const metadata = {
  title: "Contacto | Café Guardián",
  description: "Comunícate con el equipo de Café Guardián.",
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#faf7f4] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-coffee-950 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-300">Estamos contigo</p>
        <h1 className="mt-2 text-3xl font-semibold">Contacto</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-coffee-100/75">Comunícate con el equipo de Café Guardián. Estamos disponibles para ayudarte con tu cuenta y el cuidado de tu cafetal.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a href="mailto:soporte@cafeguardian.pe" className="flex min-h-16 items-center gap-3 rounded-xl bg-white/10 p-4 text-sm transition hover:bg-white/15">
            <Mail className="size-5 text-coffee-300" aria-hidden="true" />
            <span><strong className="block font-medium">Correo electrónico</strong><span className="text-coffee-100/70">soporte@cafeguardian.pe</span></span>
          </a>
          <a href="tel:+51987654321" className="flex min-h-16 items-center gap-3 rounded-xl bg-white/10 p-4 text-sm transition hover:bg-white/15">
            <Phone className="size-5 text-coffee-300" aria-hidden="true" />
            <span><strong className="block font-medium">Asesor agrónomo</strong><span className="text-coffee-100/70">+51 987 654 321</span></span>
          </a>
        </div>
      </div>
    </main>
  )
}
