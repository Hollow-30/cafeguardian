import { isConclusive, type DiagnosisKey } from "@/content/diagnosis"

/** A confident rust result must never use the healthy (green) presentation. */
export function getResultPresentation(label: DiagnosisKey, confidence: number) {
  const result: DiagnosisKey = isConclusive(confidence) ? label : "inconclusive"
  const tone = result === "healthy" ? "green" : result === "rust" ? "red" : "yellow"
  return { result, tone } as const
}
