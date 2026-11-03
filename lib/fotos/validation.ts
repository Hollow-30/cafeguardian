export const FOTO_MAX_BYTES = 10 * 1024 * 1024

export const FOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type FotoAllowedType = (typeof FOTO_ALLOWED_TYPES)[number]

export function assertFotoUpload(input: { byteSize: number; contentType: string }) {
  if (!FOTO_ALLOWED_TYPES.includes(input.contentType as FotoAllowedType)) {
    throw new Error("Tipo de archivo no permitido. Usa JPEG, PNG o WebP.")
  }

  if (input.byteSize <= 0) {
    throw new Error("El archivo está vacío.")
  }

  if (input.byteSize > FOTO_MAX_BYTES) {
    throw new Error("La foto supera el límite de 10 MB.")
  }
}
