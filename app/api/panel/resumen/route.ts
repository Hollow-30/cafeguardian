import { NextResponse } from "next/server"
import { authorizePanelAccess, panelApiResponse } from "@/lib/auth/panel-access"
import { getAuthUser } from "@/lib/auth/session"

export async function GET() {
  const { status, body } = panelApiResponse(authorizePanelAccess(await getAuthUser()))
  return NextResponse.json(body, { status })
}
