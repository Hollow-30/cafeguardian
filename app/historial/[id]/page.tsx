import { DiagnosisDetail } from "@/components/diagnosis-detail"

export default async function DiagnosisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiagnosisDetail id={id} />
}
