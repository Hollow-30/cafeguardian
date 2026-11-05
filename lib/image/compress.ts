export const MAX_IMAGE_SIDE = 1280

export async function compressImage(file: Blob, maxSide = MAX_IMAGE_SIDE, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  try {
    const context = canvas.getContext("2d")
    if (!context) throw new Error("canvas-unavailable")
    context.drawImage(bitmap, 0, 0, width, height)
  } finally {
    bitmap.close()
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("compression-failed")), "image/jpeg", quality)
  })
}
