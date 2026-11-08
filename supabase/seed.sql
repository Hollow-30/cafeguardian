-- Datos de prueba ficticios. No usar nombres, correos ni zonas reales de productores.
-- Aplicar después de las migraciones:
--   psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/seed.sql

create extension if not exists pgcrypto;

-- Catálogo de planes
insert into public.planes (id, codigo, nombre, dias_duracion, activo)
values
  ('11111111-1111-4111-8111-111111111111', 'prueba_30', 'Plan de prueba 30 días', 30, true),
  ('22222222-2222-4222-8222-222222222222', 'basico_anual', 'Plan básico anual', 365, true)
on conflict (codigo) do update
set nombre = excluded.nombre,
    dias_duracion = excluded.dias_duracion,
    activo = excluded.activo;

-- Usuarios inventados (solo para demos locales)
-- IDs fijos para que el seed sea idempotente.
with seed_users (
  id, email, full_name, app_role
) as (
  values
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'caficultor.demo@example.com',
      'Ana Demo',
      'caficultor'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'caficultor.dos@example.com',
      'Luis Ensayo',
      'caficultor'
    )
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('demo-password-not-for-production', gen_salt('bf')),
  timezone('utc', now()),
  jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email'),
    'role', app_role
  ),
  jsonb_build_object('full_name', full_name),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
from seed_users
on conflict (id) do nothing;

-- Identidades mínimas para Auth (si la columna provider_id existe en el proyecto)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
from auth.users u
where u.email in ('caficultor.demo@example.com', 'caficultor.dos@example.com')
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- Asegurar perfiles (por si el trigger no corrió en on conflict do nothing)
insert into public.profiles (id, full_name, rol)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ana Demo', 'caficultor'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Luis Ensayo', 'caficultor')
on conflict (id) do update
set full_name = excluded.full_name,
    rol = excluded.rol;

-- Zonas inventadas (Saposoa genérico, no fincas reales)
insert into public.zonas (id, profile_id, distrito, centro_poblado, etiqueta, gps_aproximado)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Alto Saposoa',
    'Centro Poblado Ejemplo Norte',
    'Alto Saposoa · Centro Poblado Ejemplo Norte',
    false
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Baja Saposoa',
    'Centro Poblado Ejemplo Sur',
    'Zona detectada por ubicación actual',
    true
  )
on conflict (id) do nothing;

-- Fotos ficticias (paths inventados, sin binarios)
insert into public.fotos (id, zona_id, profile_id, storage_path, consentimiento_anonimo, estado)
values
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'seed/demo/hoja-01.jpg',
    true,
    'procesada'
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'seed/demo/hoja-02.jpg',
    false,
    'pendiente'
  )
on conflict (id) do nothing;

-- Resultados inventados
insert into public.resultados (id, foto_id, profile_id, tipo, etiqueta, confianza, detalle)
values
  (
    '99999999-9999-4999-8999-999999999999',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'diagnostico',
    'posible_roya',
    0.8200,
    '{"fuente":"seed","nota":"resultado inventado"}'::jsonb
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'semaforo',
    'favorabilidad_media',
    0.5500,
    '{"fuente":"seed","horas_favorables":12}'::jsonb
  )
on conflict (id) do nothing;

-- Suscripciones de prueba
insert into public.suscripciones (id, profile_id, plan_id, estado, inicia_en, termina_en)
values
  (
    '77777777-7777-4777-8777-777777777777',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'activa',
    current_date,
    current_date + 30
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    'activa',
    current_date - 10,
    current_date + 20
  )
on conflict (id) do nothing;

-- Eventos inventados
insert into public.eventos (id, profile_id, tipo, entidad, entidad_id, metadata)
values
  (
    '55555555-5555-4555-8555-555555555555',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'zona_creada',
    'zonas',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '{"origen":"seed"}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'foto_subida',
    'fotos',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '{"origen":"seed"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'plan_activado',
    'suscripciones',
    '66666666-6666-4666-8666-666666666666',
    '{"plan":"prueba_30","origen":"seed"}'::jsonb
  )
on conflict (id) do nothing;

-- Catálogo de zonas con coordenadas para el clima (CAFG-159).
-- Son zonas geográficas públicas, no fincas ni productores reales.
-- Solo Saposoa tiene la coordenada verificada en un mapa. Las demás usan provisionalmente
-- esa misma coordenada y quedan con coordenada_verificada = false hasta validarlas.
-- Para probar otros lugares (por ejemplo cerca de Lima) se usa scripts/semaforo/clima-saposoa.mjs
-- con --lat y --lon; no se agregan zonas de prueba a este seed.
-- Repetir el seed es seguro: actualiza solo las filas aún no verificadas y nunca pisa una verificada.
insert into public.zonas_clima (nombre, distrito, centro_poblado, latitud, longitud, coordenada_verificada, activo)
values
  ('Saposoa', 'Saposoa', null, -6.935035721896322, -76.77095139528569, true, true),
  ('Alto Saposoa', 'Alto Saposoa', null, -6.935035721896322, -76.77095139528569, false, true), -- coordenadas de Saposoa, provisional, por validar en mapa
  ('Baja Saposoa', 'Baja Saposoa', null, -6.935035721896322, -76.77095139528569, false, true), -- coordenadas de Saposoa, provisional, por validar en mapa
  ('El Dorado', 'El Dorado', null, -6.935035721896322, -76.77095139528569, false, false), -- coordenadas de Saposoa, provisional, por validar en mapa; inactiva hasta verificar coordenadas en mapa
  ('San Martín', 'San Martín', null, -6.935035721896322, -76.77095139528569, false, false), -- coordenadas de Saposoa, provisional, por validar en mapa; inactiva hasta verificar coordenadas en mapa
  ('Centro Poblado Nuevo Progreso', null, 'Centro Poblado Nuevo Progreso', -6.935035721896322, -76.77095139528569, false, false), -- coordenadas de Saposoa, provisional, por validar en mapa; inactiva hasta verificar coordenadas en mapa
  ('Centro Poblado Santa Rosa', null, 'Centro Poblado Santa Rosa', -6.935035721896322, -76.77095139528569, false, false), -- coordenadas de Saposoa, provisional, por validar en mapa; inactiva hasta verificar coordenadas en mapa
  ('Centro Poblado El Porvenir', null, 'Centro Poblado El Porvenir', -6.935035721896322, -76.77095139528569, false, false) -- coordenadas de Saposoa, provisional, por validar en mapa; inactiva hasta verificar coordenadas en mapa
on conflict (nombre) do update
set distrito = excluded.distrito,
    centro_poblado = excluded.centro_poblado,
    latitud = excluded.latitud,
    longitud = excluded.longitud
where zonas_clima.coordenada_verificada = false;
