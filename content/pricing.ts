export type PlanFeatureValue = "included" | "limited" | "excluded"

export type PlanComparisonRow = {
  label: string
  free: PlanFeatureValue
  freeDetail?: string
  premium: PlanFeatureValue
  premiumDetail?: string
}

export const pricingContent = {
  title: "Elige cómo cuidar tu cafetal",
  subtitle: "Empieza gratis. Si necesitas más fotos y seguimiento, pasa a Premium cuando quieras.",
  referentialLabel: "Precio referencial",
  trial: "Al registrarte tienes 30 días de Premium de prueba, sin tarjeta y con fotos ilimitadas.",
  comparison: [
    {
      label: "Semáforo de riesgo de tu zona",
      free: "included",
      premium: "included",
    },
    {
      label: "Fotos con análisis",
      free: "limited",
      freeDetail: "10 al mes",
      premium: "included",
      premiumDetail: "Ilimitadas",
    },
    {
      label: "Historial guardado en tu cuenta",
      free: "included",
      premium: "included",
    },
    {
      label: "Notas en tus registros",
      free: "excluded",
      premium: "included",
    },
    {
      label: "Pensado para tu técnico",
      free: "limited",
      freeDetail: "Vista básica",
      premium: "included",
      premiumDetail: "Listo para compartir",
    },
  ] satisfies PlanComparisonRow[],
  plans: [
    {
      id: "free",
      name: "Gratis",
      price: "S/0",
      cadence: "para empezar sin tarjeta",
      summary: "Ideal para probar el cuidado de tus hojas con calma.",
    },
    {
      id: "premium",
      name: "Premium",
      price: "S/12",
      cadence: "al mes",
      summary: "Para registrar sin límite y llevar el seguimiento de tu parcela.",
    },
  ],
  nextStep: "Pasar a Premium",
  currentPlan: "Plan actual",
  trialBadge: "En prueba",
  usedPhotos: "fotos usadas este mes",
  unlimitedPhotos: "ilimitadas",
  quotaExhausted: "Has usado todas tus fotos gratuitas este mes.",
  noCard: "Sin tarjeta para empezar",
  includedLabel: "Incluido",
  excludedLabel: "No incluido",
  demoLabel: "Demostración",
  otherPayment: "Pagar con Yape o transferencia",
} as const

export const trialDays = 30
export const freePhotoQuota = 10
