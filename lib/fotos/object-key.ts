const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function extensionForContentType(contentType: string): string {
  const ext = EXTENSIONS[contentType]
  if (!ext) {
    throw new Error("Tipo de imagen no permitido.")
  }
  return ext
}

export function buildFotoObjectKey(input: {
  fotoId: string
  contentType: string
  profileId?: string
  email?: string
  fullName?: string
}): string {
  const ext = extensionForContentType(input.contentType)
  return `fotos/${input.fotoId}.${ext}`
}
