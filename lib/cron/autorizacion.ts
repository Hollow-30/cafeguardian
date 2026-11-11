import { createHash, timingSafeEqual } from "node:crypto"

const hash = (texto: string) => createHash("sha256").update(texto).digest()

// Vercel Cron manda "Authorization: Bearer <CRON_SECRET>". Sin secreto configurado no se autoriza nada.
// Se comparan los hashes SHA-256 en tiempo constante: así no se filtra el largo ni el contenido.
export function estaAutorizado(encabezado: string | null, secreto: string | undefined): boolean {
  if (!secreto || !encabezado) return false
  return timingSafeEqual(hash(encabezado), hash(`Bearer ${secreto}`))
}
