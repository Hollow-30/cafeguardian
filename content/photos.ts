export const photoCopy = {
  eyebrow: "Registro de hoja",
  title: "Sube una foto de tu hoja",
  description: "Analizamos la foto con conexión a internet. Puedes guardar el resultado en tu teléfono.",
  camera: "Tomar foto",
  gallery: "Elegir de galería",
  previewTitle: "Revisa tu foto",
  usePhoto: "Usar esta foto",
  repeat: "Repetir",
  processing: "Analizando la hoja...",
  loteLabel: "Lote o parcela (opcional)",
  lotePlaceholder: "Ej. Lote 3 o La Esperanza",
  tipsTitle: "Para una mejor foto",
  tips: ["Una sola hoja", "De cerca", "Con luz natural"],
  consentLabel: "Autorizo usar esta foto de forma anónima para mejorar el modelo (opcional).",
  saved: "Foto guardada. Queda pendiente de análisis.",
  quotaExhausted: "Has usado todas tus fotos gratuitas este mes. Pasa a Premium o espera al próximo mes.",
  offlineQueued: "Sin conexión: guardamos la foto y la analizaremos al recuperar internet.",
  errors: {
    invalidType: "Elige una imagen JPG, PNG o WEBP.",
    tooLarge: "La imagen pesa demasiado. El máximo es 10 MB.",
    cameraPermission: "No se pudo acceder a la cámara. Puedes elegir una foto de tu galería.",
    generic: "No pudimos leer la foto. Intenta nuevamente.",
    offline: "Necesitas conexión para analizar la foto. La guardamos para cuando vuelvas a estar en línea.",
  },
} as const

export function quotaWarningLabel(remaining: number, quota: number) {
  return `Te quedan ${remaining} de ${quota} fotos gratis este mes.`
}
