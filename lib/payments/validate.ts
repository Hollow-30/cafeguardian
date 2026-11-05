export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const

export function validateReceipt(file: Pick<File, "type" | "size">): string | null {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) return "Usa una imagen JPG, PNG, WEBP o un PDF."
  if (file.size > MAX_RECEIPT_BYTES) return "El comprobante debe pesar máximo 5 MB."
  return null
}
