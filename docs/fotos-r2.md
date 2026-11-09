# Fotos seguras en Cloudflare R2

## Criterios cubiertos

- Solo dueño y Superadministrador ven/borran
- Nombre de objeto sin datos personales: `fotos/{uuid}.jpg`
- Límite **10 MB** (JPEG/PNG/WebP)
- Se puede eliminar (R2 + fila en DB)
- Historial: foto, fecha/hora, resultado, confianza, zona, semáforo del día
- Un solo usuario por foto (`profile_id`)

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/fotos` | multipart: `file`, `zona_id` **o** `zona_etiqueta` (crea/reusa zona), opcionales `resultado_etiqueta`, `confianza`, `semaforo_dia`, `semaforo_fecha` |
| `GET` | `/api/fotos` | historial del usuario (superadmin puede ver todos) |
| `GET` | `/api/fotos/[id]` | metadata del historial |
| `GET` | `/api/fotos/[id]/archivo` | binario (ACL) |
| `DELETE` | `/api/fotos/[id]` | borra R2 + registro |

El front (`/historial`, `/historial/[id]`) consume estas rutas y mezcla registros remotos con los offline de IndexedDB.

## Variables de entorno

Preferidas (API S3 de R2):

```bash
R2_ACCOUNT_ID=...
R2_BUCKET=cafeguardian
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

En Cloudflare: **R2 → Manage R2 API Tokens → Create API token**  
(Object Read & Write sobre el bucket `cafeguardian`). Te da **Access Key ID** y **Secret Access Key**.

## Migración

```bash
pnpm db:migrate
```

Incluye `supabase/migrations/20261102_fotos_historial_r2.sql`.
