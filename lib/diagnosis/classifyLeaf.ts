import { diagnosisCopy, type DiagnosisKey } from "@/content/diagnosis"

export type Classification = { label: DiagnosisKey; confidence: number; isDemo: boolean }

/** Adaptador único para reemplazar por el modelo real cuando esté disponible. */
export async function classifyLeaf(_blob: Blob): Promise<Classification> {
  return { label: "healthy", confidence: diagnosisCopy.confidenceThreshold, isDemo: true }
}
