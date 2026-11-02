# Modelo de datos — Café Guardián

## Objetivo

Persistir usuarios, zonas, fotos, resultados, planes y eventos en Supabase Postgres, con esquema documentado, migraciones reproducibles y datos de prueba ficticios.

## Alcance

- Tablas públicas + RLS
- Perfil 1:1 con `auth.users`
- Catálogo de planes + suscripciones
- Seed sin datos reales
- Documentación del esquema

## Fuera de alcance

- UI de captura
- Upload real a Storage
- Entrenamiento ML / semáforo en runtime
- Billing real

## Modelo lean

```
auth.users 1—1 profiles
profiles 1—N zonas
zonas 1—N fotos
fotos 1—N resultados
profiles 1—N suscripciones N—1 planes
profiles 1—N eventos
```

## Seguridad

- Caficultor: solo filas propias
- Superadministrador: lectura de todo el dominio (panel)
- Rol de app en `auth.users.raw_app_meta_data.role` (ya controlado)
- `profiles.rol` espejo para consultas; no es fuente de verdad del panel

## Entregables

1. `supabase/migrations/20261102_core_data_model.sql`
2. `supabase/seed.sql`
3. `docs/modelo-datos.md`
