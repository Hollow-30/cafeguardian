import { redirect } from "next/navigation"
import { ManualPayment } from "@/components/manual-payment"

type Props = {
  searchParams?: Promise<{ metodo?: string }>
}

/** Culqi vive en /planes (SDK). Esta ruta solo queda para Yape/transferencia. */
export default async function PaymentPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {}
  const metodo = params.metodo?.trim().toLowerCase()
  if (metodo !== "yape" && metodo !== "transfer") {
    redirect("/planes")
  }
  return <ManualPayment initialMethod={metodo === "transfer" ? "transfer" : "yape"} />
}
