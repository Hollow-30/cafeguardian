import { NextResponse, type NextRequest } from "next/server"
import { panelGateDecision } from "@/lib/auth/panel-access"
import { isAuthenticatedFeaturePath, isPanelApiPath, isPanelPath } from "@/lib/auth/roles"
import { getProxyUser } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPanel = isPanelPath(pathname) || isPanelApiPath(pathname)
  const isFeature = isAuthenticatedFeaturePath(pathname)

  if (!isPanel && !isFeature) {
    return NextResponse.next()
  }

  const { user, response } = await getProxyUser(request)

  if (isPanel) {
    const decision = panelGateDecision({ pathname, user })
    if (decision.action === "redirect") {
      const redirect = NextResponse.redirect(new URL(decision.to, request.url))
      response.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie)
      })
      return redirect
    }

    if (decision.action === "json") {
      const json = NextResponse.json(decision.body, { status: decision.status })
      response.cookies.getAll().forEach((cookie) => {
        json.cookies.set(cookie)
      })
      return json
    }

    return response
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    const redirect = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie)
    })
    return redirect
  }

  return response
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/api/panel/:path*", "/diagnostico/:path*", "/historial/:path*", "/planes/:path*", "/mis-pagos"],
}
