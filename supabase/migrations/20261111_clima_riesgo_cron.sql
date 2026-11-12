-- CAFG-111: clima por hora, semáforo diario por zona y registro de corridas del cron.
-- Escribe el cron con service_role (se salta RLS): por eso no hay políticas de insert, update ni delete.
-- Reproducible con: psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261111_clima_riesgo_cron.sql
-- Requiere las migraciones anteriores (usa zonas_clima e is_superadministrador).

-- Clima por hora de un punto de coordenadas. Varias zonas pueden compartir el mismo punto.
create table if not exists public.clima_diario (
  id uuid primary key default gen_random_uuid(),
  latitud numeric(9, 6) not null check (latitud between -90 and 90),
  longitud numeric(9, 6) not null check (longitud between -180 and 180),
  fecha date not null,
  horas jsonb not null check (jsonb_typeof(horas) = 'array'),
  fuente text not null default 'open-meteo',
  descargado_en timestamptz not null default timezone('utc', now()),
  constraint clima_diario_punto_fecha_key unique (latitud, longitud, fecha)
);

-- Semáforo de una zona del catálogo en una fecha.
create table if not exists public.riesgo_diario (
  id uuid primary key default gen_random_uuid(),
  zona_clima_id uuid not null references public.zonas_clima (id) on delete cascade,
  fecha date not null,
  nivel text not null check (nivel in ('poco_favorable', 'favorable', 'muy_favorable')),
  indice numeric(3, 2) not null check (indice between 0 and 1),
  motivo text not null,
  detalle jsonb not null default '{}'::jsonb,
  calculado_en timestamptz not null default timezone('utc', now()),
  constraint riesgo_diario_zona_fecha_key unique (zona_clima_id, fecha)
);

-- Una fila por corrida del cron.
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  inicio timestamptz not null default timezone('utc', now()),
  fin timestamptz,
  estado text not null default 'en_curso'
    check (estado in ('en_curso', 'ok', 'parcial', 'error')),
  zonas_ok integer not null default 0,
  zonas_con_error integer not null default 0,
  detalle jsonb not null default '{}'::jsonb
);

alter table public.clima_diario enable row level security;
alter table public.riesgo_diario enable row level security;
alter table public.cron_runs enable row level security;

-- Semáforo: lectura para cualquier usuario con sesión.
drop policy if exists riesgo_diario_select_authenticated on public.riesgo_diario;
create policy riesgo_diario_select_authenticated on public.riesgo_diario
for select to authenticated
using (true);

-- Clima y corridas: solo el superadministrador.
drop policy if exists clima_diario_select_admin on public.clima_diario;
create policy clima_diario_select_admin on public.clima_diario
for select to authenticated
using (public.is_superadministrador());

drop policy if exists cron_runs_select_admin on public.cron_runs;
create policy cron_runs_select_admin on public.cron_runs
for select to authenticated
using (public.is_superadministrador());
