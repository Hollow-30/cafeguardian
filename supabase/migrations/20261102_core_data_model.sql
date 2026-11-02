-- Modelo lean de Café Guardián: usuarios, zonas, fotos, resultados, planes y eventos.
-- Reproducible con: psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261102_core_data_model.sql

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    'caficultor'
  );
$$;

create or replace function public.is_superadministrador()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'superadministrador';
$$;

-- Perfiles (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  rol text not null default 'caficultor'
    check (rol in ('caficultor', 'superadministrador')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Zonas generales (sin coordenadas exactas)
create table if not exists public.zonas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  distrito text not null,
  centro_poblado text,
  etiqueta text not null,
  gps_aproximado boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists zonas_profile_id_idx on public.zonas (profile_id);

drop trigger if exists zonas_set_updated_at on public.zonas;
create trigger zonas_set_updated_at
before update on public.zonas
for each row execute function public.set_updated_at();

-- Fotos de observación
create table if not exists public.fotos (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references public.zonas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  consentimiento_anonimo boolean not null default false,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesada', 'error')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists fotos_zona_id_idx on public.fotos (zona_id);
create index if not exists fotos_profile_id_idx on public.fotos (profile_id);

-- Resultados de diagnóstico / semáforo
create table if not exists public.resultados (
  id uuid primary key default gen_random_uuid(),
  foto_id uuid not null references public.fotos (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('diagnostico', 'semaforo')),
  etiqueta text not null,
  confianza numeric(5, 4) check (confianza is null or (confianza >= 0 and confianza <= 1)),
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists resultados_foto_id_idx on public.resultados (foto_id);
create index if not exists resultados_profile_id_idx on public.resultados (profile_id);

-- Catálogo de planes
create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  dias_duracion integer not null check (dias_duracion > 0),
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- Suscripciones perfil ↔ plan
create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.planes (id) on delete restrict,
  estado text not null default 'activa'
    check (estado in ('activa', 'vencida', 'cancelada')),
  inicia_en date not null,
  termina_en date not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (termina_en >= inicia_en)
);

create index if not exists suscripciones_profile_id_idx on public.suscripciones (profile_id);

-- Bitácora de eventos
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,
  entidad text,
  entidad_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists eventos_profile_id_idx on public.eventos (profile_id);
create index if not exists eventos_tipo_idx on public.eventos (tipo);

-- Crear perfil al registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role text;
begin
  resolved_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'caficultor');
  if resolved_role not in ('caficultor', 'superadministrador') then
    resolved_role := 'caficultor';
  end if;

  insert into public.profiles (id, full_name, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), ''),
    resolved_role
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        rol = excluded.rol,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.zonas enable row level security;
alter table public.fotos enable row level security;
alter table public.resultados enable row level security;
alter table public.planes enable row level security;
alter table public.suscripciones enable row level security;
alter table public.eventos enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_superadministrador());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and rol = (select p.rol from public.profiles p where p.id = auth.uid()));

-- zonas
drop policy if exists zonas_select_own_or_admin on public.zonas;
create policy zonas_select_own_or_admin on public.zonas
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists zonas_insert_own on public.zonas;
create policy zonas_insert_own on public.zonas
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists zonas_update_own on public.zonas;
create policy zonas_update_own on public.zonas
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists zonas_delete_own on public.zonas;
create policy zonas_delete_own on public.zonas
for delete to authenticated
using (profile_id = auth.uid());

-- fotos
drop policy if exists fotos_select_own_or_admin on public.fotos;
create policy fotos_select_own_or_admin on public.fotos
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists fotos_insert_own on public.fotos;
create policy fotos_insert_own on public.fotos
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists fotos_update_own on public.fotos;
create policy fotos_update_own on public.fotos
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- resultados
drop policy if exists resultados_select_own_or_admin on public.resultados;
create policy resultados_select_own_or_admin on public.resultados
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists resultados_insert_own on public.resultados;
create policy resultados_insert_own on public.resultados
for insert to authenticated
with check (profile_id = auth.uid());

-- planes: lectura para autenticados
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
for select to authenticated
using (true);

-- suscripciones
drop policy if exists suscripciones_select_own_or_admin on public.suscripciones;
create policy suscripciones_select_own_or_admin on public.suscripciones
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
for insert to authenticated
with check (profile_id = auth.uid());

-- eventos
drop policy if exists eventos_select_own_or_admin on public.eventos;
create policy eventos_select_own_or_admin on public.eventos
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists eventos_insert_own on public.eventos;
create policy eventos_insert_own on public.eventos
for insert to authenticated
with check (profile_id = auth.uid());
