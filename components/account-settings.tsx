"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle2, CreditCard, KeyRound, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AccountSettingsProps = {
  email: string
  name: string
  avatarUrl: string
}

export function AccountSettings({ email: initialEmail, name: initialName, avatarUrl: initialAvatarUrl }: AccountSettingsProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileLoading(true)
    setProfileMessage("")
    setProfileError("")

    const emailChanged = email.trim() !== initialEmail
    const { error } = await createClient().auth.updateUser({
      ...(emailChanged ? { email: email.trim() } : {}),
      data: {
        full_name: name.trim(),
        avatar_url: avatarUrl.trim() || null,
      },
    })

    if (error) {
      setProfileError(error.message)
      setProfileLoading(false)
      return
    }

    setProfileMessage(emailChanged
      ? "Perfil actualizado. Revisa tu correo para confirmar el cambio de dirección."
      : "Tu perfil se actualizó correctamente.")
    setProfileLoading(false)
    router.refresh()
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordMessage("")
    setPasswordError("")

    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.")
      return
    }

    setPasswordLoading(true)
    const { error } = await createClient().auth.updateUser({ password })

    if (error) {
      setPasswordError(error.message)
      setPasswordLoading(false)
      return
    }

    setPassword("")
    setConfirmPassword("")
    setPasswordMessage("Tu contraseña se cambió correctamente.")
    setPasswordLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#faf7f4] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coffee-700">Usuario</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-coffee-950">Mi cuenta</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Administra tus datos personales, acceso y suscripción.</p>
        </header>

        <section aria-labelledby="profile-title" className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-coffee-50 text-coffee-800"><UserRound className="size-5" aria-hidden="true" /></span>
            <div><h2 id="profile-title" className="font-semibold text-coffee-950">Datos personales</h2><p className="text-sm text-slate-500">Actualiza la información de tu perfil.</p></div>
          </div>
          <form onSubmit={saveProfile} className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-coffee-100 text-coffee-800">
                {avatarUrl ? <img src={avatarUrl} alt="Vista previa del avatar" className="size-full object-cover" /> : <UserRound className="size-7" aria-hidden="true" />}
              </div>
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700">
                Avatar (URL de imagen)
                <span className="relative">
                  <Camera className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://ejemplo.com/mi-foto.jpg" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 outline-none transition focus:border-coffee-600 focus:ring-4 focus:ring-coffee-600/10" />
                </span>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Nombre de usuario
              <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-11 rounded-xl border border-slate-200 px-3 outline-none transition focus:border-coffee-600 focus:ring-4 focus:ring-coffee-600/10" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Correo electrónico
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-11 rounded-xl border border-slate-200 px-3 outline-none transition focus:border-coffee-600 focus:ring-4 focus:ring-coffee-600/10" />
            </label>
            {profileError && <p role="alert" className="rounded-xl bg-coffee-50 px-4 py-3 text-sm text-coffee-800">{profileError}</p>}
            {profileMessage && <p role="status" className="flex items-start gap-2 rounded-xl bg-coffee-50 px-4 py-3 text-sm text-coffee-900"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{profileMessage}</p>}
            <button type="submit" disabled={profileLoading} className="min-h-11 w-fit rounded-xl bg-coffee-800 px-5 text-sm font-semibold text-white transition hover:bg-coffee-900 disabled:cursor-not-allowed disabled:opacity-60">
              {profileLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </section>

        <section aria-labelledby="password-title" className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-coffee-50 text-coffee-800"><KeyRound className="size-5" aria-hidden="true" /></span>
            <div><h2 id="password-title" className="font-semibold text-coffee-950">Cambio de contraseña</h2><p className="text-sm text-slate-500">Elige una contraseña segura de al menos 6 caracteres.</p></div>
          </div>
          <form onSubmit={changePassword} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Nueva contraseña
              <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 outline-none transition focus:border-coffee-600 focus:ring-4 focus:ring-coffee-600/10" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Confirmar nueva contraseña
              <input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 outline-none transition focus:border-coffee-600 focus:ring-4 focus:ring-coffee-600/10" />
            </label>
            {passwordError && <p role="alert" className="rounded-xl bg-coffee-50 px-4 py-3 text-sm text-coffee-800">{passwordError}</p>}
            {passwordMessage && <p role="status" className="flex items-start gap-2 rounded-xl bg-coffee-50 px-4 py-3 text-sm text-coffee-900"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{passwordMessage}</p>}
            <button type="submit" disabled={passwordLoading} className="min-h-11 w-fit rounded-xl border border-coffee-800 px-5 text-sm font-semibold text-coffee-900 transition hover:bg-coffee-50 disabled:cursor-not-allowed disabled:opacity-60">
              {passwordLoading ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>
        </section>

        <section aria-labelledby="subscription-title" className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-coffee-50 text-coffee-800"><CreditCard className="size-5" aria-hidden="true" /></span>
              <div><h2 id="subscription-title" className="font-semibold text-coffee-950">Tu suscripción</h2><p className="text-sm text-slate-500">Plan Gratuito</p></div>
            </div>
            <span className="rounded-full bg-coffee-50 px-3 py-1 text-xs font-semibold text-coffee-800">Plan base</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Acceso al semáforo de riesgo de la zona y hasta 10 fotos al mes. La aplicación aún no sincroniza las solicitudes de pago con una suscripción activa en la cuenta.</p>
          <Link href="/planes" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-coffee-800 px-5 text-sm font-semibold text-white transition hover:bg-coffee-900">Gestionar suscripción</Link>
        </section>
      </div>
    </main>
  )
}
