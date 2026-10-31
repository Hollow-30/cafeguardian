"use client"

import { FormEvent, useMemo, useState } from "react"
import { Check, ChevronLeft, Leaf, MapPin, Sprout, ShieldCheck, Eye, EyeOff, LogOut, Pencil, Navigation, Camera } from "lucide-react"

type View = "login" | "register" | "privacy" | "location" | "dashboard"

type Profile = { name: string; email: string; zone: string }

const districts = ["Alto Saposoa", "Baja Saposoa", "El Dorado", "San Martín"]
const centers = ["Centro Poblado Nuevo Progreso", "Centro Poblado Santa Rosa", "Centro Poblado El Porvenir"]

export function PrototypeFlow() {
  const [view, setView] = useState<View>("login")
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", zone: "" })
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [district, setDistrict] = useState("")
  const [center, setCenter] = useState("")
  const [gpsUsed, setGpsUsed] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [anonymousPhotos, setAnonymousPhotos] = useState(false)
  const [error, setError] = useState("")
  const [acceptedAt, setAcceptedAt] = useState("")

  const passwordValid = password.length >= 6
  const emailValid = /\S+@\S+\.\S+/.test(profile.email)
  const zone = useMemo(() => gpsUsed ? "Zona detectada por ubicación actual" : [district, center].filter(Boolean).join(" · "), [gpsUsed, district, center])

  function reset() {
    setView("login"); setProfile({ name: "", email: "", zone: "" }); setPassword(""); setConfirmation(""); setDistrict(""); setCenter(""); setGpsUsed(false); setPrivacyAccepted(false); setAnonymousPhotos(false); setError(""); setAcceptedAt("")
  }

  function submitLogin(event: FormEvent) {
    event.preventDefault(); setError("")
    if (!profile.email || !password) { setError("Ingresa tu correo y contraseña para continuar."); return }
    setView("dashboard")
  }

  function submitRegister(event: FormEvent) {
    event.preventDefault(); setError("")
    if (!emailValid) { setError("Ingresa un correo electrónico válido."); return }
    if (!passwordValid) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return }
    setView("privacy")
  }

  function acceptPrivacy(event: FormEvent) {
    event.preventDefault()
    if (!privacyAccepted) { setError("Debes aceptar el uso de tus datos para continuar."); return }
    setAcceptedAt(new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date()))
    setError(""); setView("location")
  }

  function confirmZone(event: FormEvent) {
    event.preventDefault()
    if (!zone) { setError("Selecciona una zona o usa tu ubicación actual."); return }
    setProfile((current) => ({ ...current, zone })); setError(""); setView("dashboard")
  }

  if (view === "dashboard") return <Dashboard profile={profile} onLogout={reset} onEditZone={() => setView("location")} />
  if (view === "privacy") return <Privacy acceptedAt={acceptedAt} accepted={privacyAccepted} anonymous={anonymousPhotos} error={error} onAccepted={setPrivacyAccepted} onAnonymous={setAnonymousPhotos} onBack={() => setView("register")} onSubmit={acceptPrivacy} />
  if (view === "location") return <Location district={district} center={center} gpsUsed={gpsUsed} error={error} onDistrict={setDistrict} onCenter={setCenter} onGps={() => { setGpsUsed(true); setError("") }} onBack={() => setView("privacy")} onSubmit={confirmZone} />
  return <Auth view={view} profile={profile} password={password} confirmation={confirmation} showPassword={showPassword} error={error} onProfile={setProfile} onPassword={setPassword} onConfirmation={setConfirmation} onShowPassword={() => setShowPassword(!showPassword)} onSubmit={view === "login" ? submitLogin : submitRegister} onRegister={() => { setError(""); setView("register") }} onLogin={() => { setError(""); setView("login") }} />
}

function Shell({ children, eyebrow, title, description, onBack }: { children: React.ReactNode; eyebrow: string; title: string; description: string; onBack?: () => void }) {
  return <main className="min-h-screen bg-[#f7faf8] text-slate-900"><div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]"><section className="relative hidden overflow-hidden bg-emerald-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16"><div className="absolute -right-28 top-16 size-96 rounded-full bg-emerald-800/40 blur-3xl" /><div className="relative flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700"><Sprout className="size-5" /></span><span><strong className="block tracking-tight">Café Guardián</strong><small className="text-emerald-200/70">Cuidado inteligente para tu cafetal</small></span></div><div className="relative max-w-md"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-800/70"><Leaf className="size-6 text-emerald-300" /></div><h2 className="text-4xl font-semibold leading-tight xl:text-5xl">Tu parcela, siempre bajo control.</h2><p className="mt-5 text-sm leading-7 text-emerald-100/70">Registra tu zona y mantén tus cultivos protegidos con información clara y oportuna.</p></div><p className="relative text-xs text-emerald-200/50">Una herramienta pensada para caficultores</p></section><section className="flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-md">{onBack && <button type="button" onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-800"><ChevronLeft className="size-4" />Volver</button>}<div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p></div>{children}</div></section></div></main>
}

function Auth({ view, profile, password, confirmation, showPassword, error, onProfile, onPassword, onConfirmation, onShowPassword, onSubmit, onRegister, onLogin }: any) {
  const register = view === "register"
  return <Shell eyebrow={register ? "Comienza hoy" : "Bienvenido de nuevo"} title={register ? "Crea tu cuenta" : "Ingresa a tu panel"} description={register ? "Registra tu parcela y mantén tus cultivos protegidos." : "Continúa cuidando tu cafetal con información clara y oportuna."}><form onSubmit={onSubmit} className="flex flex-col gap-5">{register && <Field label="Nombre completo"><input required value={profile.name} onChange={(e) => onProfile({ ...profile, name: e.target.value })} placeholder="Tu nombre" className="input" /></Field>}<Field label="Correo electrónico"><input required type="email" value={profile.email} onChange={(e) => onProfile({ ...profile, email: e.target.value })} placeholder="tu-correo@ejemplo.com" className={`input ${profile.email && ( /\S+@\S+\.\S+/.test(profile.email) ? "border-emerald-500" : "border-red-400")}`} /></Field><Field label="Contraseña"><div className="relative"><input required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={`input w-full pr-12 ${password && (password.length >= 6 ? "border-emerald-500" : "border-red-400")}`} /><button type="button" onClick={onShowPassword} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400" aria-label="Mostrar u ocultar contraseña">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>{register && <Field label="Confirmar contraseña"><input required type="password" value={confirmation} onChange={(e) => onConfirmation(e.target.value)} placeholder="Repite tu contraseña" className={`input ${confirmation && (password === confirmation ? "border-emerald-500" : "border-red-400")}`} /></Field>}{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}{register && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-900">Al registrarte obtienes el rol <strong>Caficultor</strong> y un <strong>plan de prueba de 30 días</strong>.</p>}<button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900">{register ? "Registrarse" : "Ingresar al panel"}</button></form><p className="mt-8 text-center text-sm text-slate-500">{register ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"} <button type="button" onClick={register ? onLogin : onRegister} className="font-semibold text-emerald-800 hover:text-emerald-950">{register ? "Inicia sesión" : "Crear cuenta"}</button></p></Shell>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">{label}{children}</label> }

function Privacy({ accepted, anonymous, acceptedAt, error, onAccepted, onAnonymous, onBack, onSubmit }: any) { return <Shell eyebrow="Paso 1 de 2" title="Tu privacidad primero" description="Antes de configurar tu parcela, revisa cómo cuidaremos la información que compartas." onBack={onBack}><form onSubmit={onSubmit} className="flex flex-col gap-5"><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950"><ShieldCheck className="mb-3 size-6 text-emerald-700" /><p>Guardaremos tus fotos y datos generales de la zona para que la aplicación funcione y puedas consultar el historial de tu cafetal.</p></div><label className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-5"><input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} className="mt-1 accent-emerald-700" />Acepto el uso de mis datos para el funcionamiento de la app.</label><label className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-5"><input type="checkbox" checked={anonymous} onChange={(e) => onAnonymous(e.target.checked)} className="mt-1 accent-emerald-700" />Permito que mis fotos se usen de forma anónima para mejorar el modelo de detección.</label>{acceptedAt && <p className="text-xs text-slate-500">Aceptado el {acceptedAt}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}<button type="submit" className="h-12 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900">Continuar con mi zona</button></form></Shell> }

function Location({ district, center, gpsUsed, error, onDistrict, onCenter, onGps, onBack, onSubmit }: any) { return <Shell eyebrow="Paso 2 de 2" title="¿Dónde está tu finca?" description="Configura una zona general para recibir información relevante de tu territorio." onBack={onBack}><form onSubmit={onSubmit} className="flex flex-col gap-5"><button type="button" onClick={onGps} className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-semibold ${gpsUsed ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-emerald-700 text-emerald-800 hover:bg-emerald-50"}`}><Navigation className="size-4" />{gpsUsed ? "Ubicación actual seleccionada" : "Usar mi ubicación actual"}</button><div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />o elige manualmente<span className="h-px flex-1 bg-slate-200" /></div><Field label="Distrito"><select value={district} onChange={(e) => { onDistrict(e.target.value); }} className="input" disabled={gpsUsed}><option value="">Selecciona un distrito</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Centro poblado"><select value={center} onChange={(e) => onCenter(e.target.value)} className="input" disabled={gpsUsed}><option value="">Selecciona un centro poblado</option>{centers.map((item) => <option key={item}>{item}</option>)}</select></Field><p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><MapPin className="mr-1 inline size-3.5" />Solo se guardará la zona general, no la ubicación exacta.</p>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}<button type="submit" className="h-12 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900">Confirmar zona</button></form></Shell> }

function Dashboard({ profile, onLogout, onEditZone }: { profile: Profile; onLogout: () => void; onEditZone: () => void }) { return <main className="min-h-screen bg-[#f7faf8] text-slate-900"><header className="border-b border-emerald-950/10 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white"><Sprout className="size-5" /></div><div><p className="font-bold tracking-tight text-emerald-950">Café Guardián</p><p className="text-xs text-slate-500">Panel del Caficultor</p></div></div><button type="button" onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700"><LogOut className="size-4" />Cerrar sesión</button></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><section className="rounded-3xl bg-emerald-950 px-6 py-8 text-white sm:px-10"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800"><ShieldCheck className="size-6 text-emerald-300" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Panel listo</p><h1 className="mt-2 text-3xl font-semibold">Hola, {profile.name || "caficultor"}.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-emerald-100/75">Tu espacio está preparado para comenzar a registrar observaciones de tu cafetal.</p></div></div></section><div className="mt-8 grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Zona de tu finca</p><h2 className="mt-2 text-lg font-semibold text-emerald-950">{profile.zone || "Sin zona configurada"}</h2></div><button type="button" onClick={onEditZone} className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><Pencil className="size-3.5" />Editar zona</button></div><p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><MapPin className="size-4 text-emerald-700" />Zona general protegida</p></section><section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Camera className="size-5" /></div><div><h2 className="font-semibold text-emerald-950">Aún no hay diagnósticos</h2><p className="mt-1 text-sm text-slate-500">Cuando registres una observación, aparecerá aquí.</p></div></div></section></div></div></main> }
