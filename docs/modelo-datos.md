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
   └─ riesgo_diario (1:N, semáforo por zona y fecha)

clima_diario  (clima por hora de un punto de coordenadas y una fecha; sin clave foránea)
cron_runs     (una fila por corrida de la descarga diaria)
```

## Tablas

| Tabla | Propósito | Campos clave |
|---|---|---|
| `profiles` | Perfil de app ligado a Auth | `id`, `full_name`, `rol` |
| `zonas` | Zona general de la finca (sin GPS exacto) | `distrito`, `centro_poblado`, `etiqueta`, `gps_aproximado` |
| `zonas_clima` | Catálogo compartido de zonas con coordenadas para el clima | `nombre`, `distrito`, `centro_poblado`, `latitud`, `longitud`, `coordenada_verificada`, `activo` |
| `clima_diario` | Clima por hora (48 h) de un punto, con fuente y fecha de descarga | `latitud`, `longitud`, `fecha`, `horas`, `fuente`, `descargado_en` |
| `riesgo_diario` | Semáforo calculado por zona del catálogo y fecha | `zona_clima_id`, `fecha`, `nivel`, `indice`, `motivo`, `detalle` |
| `cron_runs` | Registro de cada corrida de la descarga diaria | `inicio`, `fin`, `estado`, `zonas_ok`, `zonas_con_error`, `detalle` |
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
- `riesgo_diario`: cualquier usuario con sesión la lee. `clima_diario` y `cron_runs`: solo las lee el Superadministrador. Las tres no tienen políticas de escritura: las escribe la descarga diaria con la clave de servicio (que se salta RLS).

## Migraciones reproducibles

Orden:

1. `supabase/migrations/20261102_controlled_superadmin_role.sql`
2. `supabase/migrations/20261102_core_data_model.sql`
3. `supabase/migrations/20261102_fotos_historial_r2.sql`
4. `supabase/migrations/20261107_zonas_clima.sql`
5. `supabase/migrations/20261111_clima_riesgo_cron.sql` (CAFG-111; necesita las anteriores)
6. `supabase/seed.sql` (datos ficticios y catálogo de zonas)

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
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261111_clima_riesgo_cron.sql
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

## Clima, semáforo y corridas (CAFG-111)

Las llena la descarga diaria; el detalle de cómo funciona está en [`docs/semaforo/descarga-clima.md`](semaforo/descarga-clima.md).

- `clima_diario`: una fila por punto (`latitud`, `longitud`) y `fecha`. `horas` guarda las 48 horas (ayer y hoy en hora de Lima) en formato JSON, con la `fuente` (`open-meteo`) y cuándo se descargó. Única por `(latitud, longitud, fecha)`.
- `riesgo_diario`: una fila por zona del catálogo y `fecha`, con `nivel`, `indice` (0 a 1), `motivo` y `detalle`. Única por `(zona_clima_id, fecha)`. Si no hubo datos suficientes no se escribe fila, así que no existen filas sin nivel.
- `cron_runs`: una fila por corrida (`en_curso`, `ok`, `parcial` o `error`), con cuántas zonas salieron bien o con error y el detalle por punto.

### Comprobar sin tocar datos

Otra persona con acceso a la base puede correr esto con `psql`; solo lee.

```sql
-- Esperado: 3 filas, todas con relrowsecurity = true
select relname, relrowsecurity from pg_class
where oid in ('public.clima_diario'::regclass, 'public.riesgo_diario'::regclass, 'public.cron_runs'::regclass);

-- Esperado: riesgo_diario_select_authenticated, clima_diario_select_admin, cron_runs_select_admin (solo select)
select tablename, policyname, cmd from pg_policies
where tablename in ('clima_diario', 'riesgo_diario', 'cron_runs') order by tablename;

-- Después de la primera corrida: última corrida y su estado
select inicio, fin, estado, zonas_ok, zonas_con_error from public.cron_runs order by inicio desc limit 5;
```

## Datos de prueba

El seed crea solo información inventada:

- Correos: `caficultor.demo@example.com`, `caficultor.dos@example.com`
- Nombres: Ana Demo, Luis Ensayo
- Zonas: “Centro Poblado Ejemplo Norte/Sur”
- Paths de foto: `seed/demo/hoja-01.jpg` (sin archivos reales)
- `zonas_clima`: zonas geográficas públicas, no fincas ni productores reales.

No incluye datos de productores reales.
