# Plan — modelo de datos

## Archivos

- `supabase/migrations/20261102_core_data_model.sql` — tablas, triggers, RLS
- `supabase/seed.sql` — datos ficticios
- `docs/modelo-datos.md` — esquema documentado
- `scripts/db-apply.mjs` — aplicar migrate/seed con psql

## Verificación

1. `pnpm db:migrate`
2. `pnpm db:seed`
3. Contar filas en `profiles`, `zonas`, `fotos`, `resultados`, `planes`, `suscripciones`, `eventos`
