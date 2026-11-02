import { NextResponse, type NextRequest } from "next/server"
import { panelGateDecision } from "@/lib/auth/panel-access"
import { isPanelApiPath, isPanelPath } from "@/lib/auth/roles"
import { getProxyUser } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isPanelPath(pathname) && !isPanelApiPath(pathname)) {
    return NextResponse.next()
  }

  const { user, response } = await getProxyUser(request)
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

export const config = {
  matcher: ["/panel", "/panel/:path*", "/api/panel/:path*"],
}
