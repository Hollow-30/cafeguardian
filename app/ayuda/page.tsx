import { CircleHelp } from "lucide-react"

export const metadata = {
  title: "Centro de ayuda | Café Guardián",
  description: "Respuestas a preguntas frecuentes sobre Café Guardián.",
}

const answers = [
  {
    question: "¿Cómo inicio un diagnóstico?",
    answer: "Abre Nuevo diagnóstico, toma una foto o selecciona una imagen de una hoja de café y sigue las indicaciones.",
  },
  {
    question: "¿Dónde consulto mis diagnósticos anteriores?",
    answer: "En Historial puedes revisar los diagnósticos guardados en tu cuenta.",
  },
  {
    question: "¿Cómo actualizo mis datos o contraseña?",
    answer: "Abre el menú de usuario y selecciona Mi cuenta. Desde allí puedes editar tu nombre, correo, avatar y contraseña.",
  },
  {
    question: "¿Cómo puedo mejorar mi plan?",
    answer: "En el menú de usuario selecciona Mejorar plan o abre Gestionar suscripción desde Mi cuenta.",
  },
]

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><CircleHelp className="size-6" aria-hidden="true" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ayuda</p><h1 className="mt-1 text-3xl font-semibold text-emerald-950">Centro de ayuda</h1></div>
        </div>
        <div className="divide-y divide-emerald-100 rounded-2xl border border-emerald-100 bg-white px-5 shadow-sm">
          {answers.map(({ question, answer }) => (
            <section key={question} className="py-5">
              <h2 className="font-semibold text-emerald-950">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
