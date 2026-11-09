import { NextResponse } from "next/server"
import { authorizePanelAccess } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"
import { listPanelUsuarios } from "@/lib/panel/data"

export const runtime = "nodejs"

export async function GET() {
  const access = authorizePanelAccess(await getAuthUser())
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  try {
    const items = await listPanelUsuarios()
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la lista de usuarios." },
      { status: 500 },
    )
  }
}
