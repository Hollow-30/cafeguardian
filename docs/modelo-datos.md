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

zonas_clima   (catálogo compartido con coordenadas; sin relación con profiles)
```

## Tablas

| Tabla | Propósito | Campos clave |
|---|---|---|
| `profiles` | Perfil de app ligado a Auth | `id`, `full_name`, `rol` |
| `zonas` | Zona general de la finca (sin GPS exacto) | `distrito`, `centro_poblado`, `etiqueta`, `gps_aproximado` |
| `zonas_clima` | Catálogo compartido de zonas con coordenadas para el clima | `nombre`, `distrito`, `centro_poblado`, `latitud`, `longitud`, `coordenada_verificada`, `activo` |
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
- `zonas_clima`: cualquier usuario con sesión la lee; solo el Superadministrador la escribe.

## Migraciones reproducibles

Orden:

1. `supabase/migrations/20261102_controlled_superadmin_role.sql`
2. `supabase/migrations/20261102_core_data_model.sql`
3. `supabase/migrations/20261102_fotos_historial_r2.sql`
4. `supabase/migrations/20261107_zonas_clima.sql`
5. `supabase/seed.sql` (datos ficticios y catálogo de zonas)

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
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261102_fotos_historial_r2.sql
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261107_zonas_clima.sql
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

O con el script:

```bash
pnpm db:migrate
pnpm db:seed
```

## Catálogo de zonas para el clima (`zonas_clima`, CAFG-159)

Una sola lista de lugares con latitud y longitud, que leen la descarga de clima (CAFG-111) y el semáforo. Es independiente de `zonas`, que sigue siendo por usuario y sin coordenadas a propósito (privacidad).

- Las zonas salen de lo que ofrece el prototipo (Alto Saposoa, Baja Saposoa, El Dorado, San Martín y tres centros poblados), más la fila **Saposoa**, que es la única con coordenada verificada en un mapa.
- `nombre` es único. Los nombres de los centros poblados usan el mismo texto del prototipo (`Centro Poblado Nuevo Progreso`, etc.) para poder enlazarlos después con `zonas`.
- Los centros poblados no tienen `distrito` todavía (se desconoce).
- Latitud y longitud se guardan con 6 decimales (unos 11 cm), mucho más fino que la malla de clima de ~9 km.
- `coordenada_verificada = false` significa que el punto es provisional: hoy repite el de Saposoa. Las zonas con `activo = false` (El Dorado, San Martín y los tres centros poblados) no deben usarse hasta verificar su coordenada en un mapa.
- **Varias zonas comparten el mismo punto de clima.** La descarga de CAFG-111 debe agrupar por coordenadas (`latitud`, `longitud`) y pedir el clima una sola vez por punto, solo para zonas con `activo = true`.
- El vínculo entre `zonas` y `zonas_clima` (`zona_clima_id`) se decide en CAFG-113 con Backend; no existe aún.
- Para probar otros lugares (por ejemplo cerca de Lima) se usa `scripts/semaforo/clima-saposoa.mjs` con `--lat` y `--lon`; no se agregan zonas de prueba al seed.

### Comprobar sin tocar datos

Otra persona con acceso a la base puede correr esto con `psql`. Los bloques 1 y 2 solo leen. El bloque 3 va dentro de una transacción que se deshace con `rollback`, y cada prueba conviene correrla por separado porque una que falla aborta la transacción.

```sql
-- 1. Datos. Esperado: total 8, verificadas 1, activas 3
select count(*) as total,
       count(*) filter (where coordenada_verificada) as verificadas,
       count(*) filter (where activo) as activas
from public.zonas_clima;

-- Esperado: 0 filas
select nombre from public.zonas_clima
where latitud not between -90 and 90 or longitud not between -180 and 180;

-- 2. RLS. Esperado: true, y 4 políticas (select, insert, update, delete)
select relrowsecurity from pg_class where oid = 'public.zonas_clima'::regclass;
select policyname, cmd from pg_policies where tablename = 'zonas_clima' order by policyname;

-- 3a. Caficultor lee. Esperado: 8
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"caficultor"}}', true);
select count(*) from public.zonas_clima;
rollback;

-- 3b. Caficultor no escribe. Esperado: error "violates row-level security policy"
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"caficultor"}}', true);
insert into public.zonas_clima (nombre, distrito, latitud, longitud) values ('Prueba', 'Prueba', 0, 0);
rollback;

-- 3c. Superadministrador escribe. Esperado: UPDATE 1 (el rollback lo deshace)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"superadministrador"}}', true);
update public.zonas_clima set activo = activo where nombre = 'Saposoa';
rollback;
```

## Datos de prueba

El seed crea solo información inventada:

- Correos: `caficultor.demo@example.com`, `caficultor.dos@example.com`
- Nombres: Ana Demo, Luis Ensayo
- Zonas: “Centro Poblado Ejemplo Norte/Sur”
- Paths de foto: `seed/demo/hoja-01.jpg` (sin archivos reales)
- `zonas_clima`: zonas geográficas públicas, no fincas ni productores reales.

No incluye datos de productores reales.
