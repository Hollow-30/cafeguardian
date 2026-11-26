import { NextResponse } from "next/server"
import { resolveRole } from "@/lib/auth/roles"
import { getAuthUser } from "@/lib/auth/session"
import { canAccessPago } from "@/lib/payments/access"
import { getFotoObject } from "@/lib/r2/client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser()
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: pago, error } = await supabase
    .from("pagos")
    .select("id, profile_id, storage_path, content_type, receipt_name")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (
    !pago ||
    !canAccessPago({ userId: user.id, role: resolveRole(user), pagoProfileId: pago.profile_id })
  ) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    const object = await getFotoObject(pago.storage_path)
    const contentType = pago.content_type || object.contentType
    const safeName = (pago.receipt_name || "comprobante").replace(/[\r\n"]/g, "_")
    return new NextResponse(Buffer.from(object.body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (readError) {
    return NextResponse.json(
      { error: readError instanceof Error ? readError.message : "Error al leer el comprobante." },
      { status: 502 },
    )
  }
}
