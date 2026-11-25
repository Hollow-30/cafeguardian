import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { authConfirmFailPath, safeAuthNextPath } from "@/lib/auth/password-recovery"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const type = searchParams.get("type") as EmailOtpType | null
  const nextParam = searchParams.get("next")
  const defaultNext = type === "recovery" ? "/nueva-contrasena" : "/"
  const next = safeAuthNextPath(nextParam, defaultNext)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")

  // Tras confirmar el alta, si no hay next explícito útil, manda a login con aviso.
  const successPath =
    type === "signup" || type === "email" ? (nextParam ? next : "/login?confirmed=1") : next

  const redirectOk = NextResponse.redirect(new URL(successPath, origin))
  const redirectFail = NextResponse.redirect(
    new URL(authConfirmFailPath({ type, next: nextParam ?? next }), origin),
  )

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    return redirectFail
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectOk.cookies.set(name, value, options)
          redirectFail.cookies.set(name, value, options)
        })
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? redirectFail : redirectOk
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    return error ? redirectFail : redirectOk
  }

  return redirectFail
}
