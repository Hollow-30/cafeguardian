# Esquema de datos — Café Guardián

Modelo lean en Supabase Postgres para usuarios, zonas, fotos, resultados, planes y eventos.

## Diagrama

```
auth.users
   └─ profiles (1:1)
         ├─ zonas (1:N)
         │     └─ fotos (1:N)
         │           └─ resultados (1:N)
         ├─ suscripciones (1:N) → planes
         └─ eventos (1:N)
```

## Tablas

| Tabla | Propósito | Campos clave |
|---|---|---|
| `profiles` | Perfil de app ligado a Auth | `id`, `full_name`, `rol` |
| `zonas` | Zona general de la finca (sin GPS exacto) | `distrito`, `centro_poblado`, `etiqueta`, `gps_aproximado` |
| `fotos` | Observación fotográfica en R2 + historial | `storage_path`, `content_type`, `byte_size`, `resultado_etiqueta`, `confianza`, `semaforo_dia`, `semaforo_fecha` |
| `resultados` | Salida de diagnóstico o semáforo | `tipo`, `etiqueta`, `confianza`, `detalle` |
| `planes` | Catálogo de planes | `codigo`, `nombre`, `dias_duracion` |
| `suscripciones` | Plan activo del caficultor | `estado`, `inicia_en`, `termina_en` |
| `eventos` | Bitácora de acciones | `tipo`, `entidad`, `metadata` |

## Roles y RLS

- **Caficultor**: lee/escribe solo sus filas.
- **Superadministrador**: puede leer todo el dominio (panel).
- El rol de autorización sigue viviendo en `auth.users.raw_app_meta_data.role`.
- `profiles.rol` es un espejo para consultas; el registro público no puede elevarlo a Superadministrador.

## Migraciones reproducibles

Orden:

1. `supabase/migrations/20261102_controlled_superadmin_role.sql`
2. `supabase/migrations/20261102_core_data_model.sql`
3. `supabase/migrations/20261102_fotos_historial_r2.sql`
4. `supabase/seed.sql` (datos ficticios)

## Fotos en Cloudflare R2

- Bucket privado `cafeguardian`
- Clave anónima: `fotos/{uuid}.jpg|png|webp` (sin email, nombre ni user id)
- Límite: **10 MB**
- API: `POST/GET/DELETE /api/fotos`, lectura binaria en `/api/fotos/[id]/archivo`
- Solo dueño o Superadministrador
- El historial guarda foto, fecha/hora, resultado, confianza, zona y semáforo del día

```bash
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261102_controlled_superadmin_role.sql
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261102_core_data_model.sql
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

O con el script:

```bash
pnpm db:migrate
pnpm db:seed
```

## Datos de prueba

El seed crea solo información inventada:

- Correos: `caficultor.demo@example.com`, `caficultor.dos@example.com`
- Nombres: Ana Demo, Luis Ensayo
- Zonas: “Centro Poblado Ejemplo Norte/Sur”
- Paths de foto: `seed/demo/hoja-01.jpg` (sin archivos reales)

No incluye datos de productores reales.
