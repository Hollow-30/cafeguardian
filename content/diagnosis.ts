export const diagnosisCopy = {
  confidenceThreshold: 60,
  interval: "vuelve a revisar tus hojas bajas en unos días [por validar con asesor agrónomo]",
  disclaimer: "Es un apoyo para decidir, no reemplaza a tu técnico",
  demo: "Resultado de demostración",
  noConclusive: "No concluyente: toma otra foto",
  labels: {
    healthy: "Sana",
    rust: "Roya",
    inconclusive: "No concluyente",
  },
  explanations: {
    healthy: "No se observan señales claras de enfermedad en esta foto.",
    rust: "La imagen muestra señales parecidas a roya, pero confirma el resultado con tu técnico.",
    inconclusive: "La foto no tiene suficiente información para orientar un resultado.",
  },
  nextStep: "Siguiente paso",
  save: "Guardar en historial",
  another: "Tomar otra foto",
} as const

export type DiagnosisKey = keyof typeof diagnosisCopy.labels
export type DiagnosisLabel = { key: DiagnosisKey; text: string }

export function getDiagnosisOrigin(isDemo: boolean | undefined) {
  if (isDemo === true) return diagnosisCopy.demo
  if (isDemo === false) return "Resultado del modelo"
  return "Origen del diagnóstico no verificado"
}

export function mapDiagnosisLabel(key: DiagnosisKey): DiagnosisLabel {
  return { key, text: diagnosisCopy.labels[key] }
}

export function getDiagnosisExplanation(key: DiagnosisKey) {
  return diagnosisCopy.explanations[key]
}

export function isConclusive(confidence: number) {
  return confidence >= diagnosisCopy.confidenceThreshold
}
