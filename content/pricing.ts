export const pricingContent = {
  title: "Planes para cuidar mejor tu cafetal",
  subtitle: "Empieza sin tarjeta y decide con calma.",
  referentialLabel: "Referencial",
  trial: "Al registrarte tienes 30 días de Premium gratis, sin tarjeta.",
  plans: [
    {
      id: "free",
      name: "Gratis",
      price: "S/0",
      cadence: "para empezar",
      features: ["Semáforo de riesgo de la zona", "10 fotos al mes"],
    },
    {
      id: "premium",
      name: "Premium",
      price: "S/12",
      cadence: "al mes",
      features: ["Fotos ilimitadas", "Historial por parcela", "Reporte para el técnico", "[Por confirmar]"],
    },
  ],
  nextStep: "Pasar a Premium",
  currentPlan: "Plan actual",
  usedPhotos: "fotos usadas este mes",
  unlimitedPhotos: "ilimitadas",
  quotaExhausted: "Has usado todas tus fotos gratuitas este mes.",
  noCard: "Sin tarjeta para empezar",
  demoLabel: "Demostración",
} as const

export const trialDays = 30
export const freePhotoQuota = 10
