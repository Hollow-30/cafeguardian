import { NextResponse } from "next/server"
import { authorizePanelAccess, panelApiResponse } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"
import { getPanelResumen } from "@/lib/panel/data"

export const runtime = "nodejs"

export async function GET() {
  const access = authorizePanelAccess(await getAuthUser())
  if (!access.ok) {
    const { status, body } = panelApiResponse(access)
    return NextResponse.json(body, { status })
  }

  try {
    const resumen = await getPanelResumen()
    const { status, body } = panelApiResponse(access, resumen)
    return NextResponse.json(body, { status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el resumen." },
      { status: 500 },
    )
  }
}
