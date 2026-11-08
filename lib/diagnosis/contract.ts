export const classificationLabels = ["healthy", "rust"] as const

export type ClassificationLabel = (typeof classificationLabels)[number]
export type Classification = { label: ClassificationLabel; confidence: number; isDemo: boolean }
export type ClassificationProvider = (blob: Blob) => Promise<unknown>

export function parseClassification(value: unknown): Classification {
  if (typeof value !== "object" || value === null) {
    throw new Error("Respuesta de clasificación inválida.")
  }

  const { label, confidence, isDemo } = value as Record<string, unknown>
  if (label !== "healthy" && label !== "rust") {
    throw new Error("La clase debe ser healthy o rust.")
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new Error("La confianza debe ser un número entre 0 y 100.")
  }
  if (typeof isDemo !== "boolean") {
    throw new Error("La respuesta debe indicar si es una demostración.")
  }

  return { label, confidence, isDemo }
}
