# Fotos seguras + historial (R2)

## Decisiones

- Límite 10 MB
- Upload vía API del servidor
- Cloudflare R2 privado (S3 API)
- Clave `fotos/{uuid}.{ext}` sin PII
- Historial en `fotos` (+ `resultados` opcionales)
- ACL: dueño o Superadministrador

## Entregables

- Migración `20261102_fotos_historial_r2.sql`
- `lib/r2`, `lib/fotos`, rutas `/api/fotos*`
- Doc `docs/fotos-r2.md`
