export default function PanelEquipoPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-700">
        Equipo
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-coffee-950">
        Operación interna
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Esta pantalla pertenece al panel del Superadministrador. El rol Caficultor no puede abrirla.
      </p>
    </main>
  )
}
