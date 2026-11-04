export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type PhotoValidationError = "invalid-type" | "too-large"

export function validatePhoto(file: Pick<File, "type" | "size">): PhotoValidationError | null {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return "invalid-type"
  if (file.size > MAX_PHOTO_BYTES) return "too-large"
  return null
}
