-- CAFG-159: catálogo compartido de zonas con coordenadas para el clima.
-- Es una tabla nueva e independiente: public.zonas (por usuario, sin coordenadas) no se toca.
-- Reproducible con: psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261107_zonas_clima.sql
-- Requiere las migraciones anteriores (usa set_updated_at e is_superadministrador).

create table if not exists public.zonas_clima (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  distrito text,
  centro_poblado text,
  latitud numeric(9, 6) not null,
  longitud numeric(9, 6) not null,
  coordenada_verificada boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint zonas_clima_latitud_rango check (latitud between -90 and 90),
  constraint zonas_clima_longitud_rango check (longitud between -180 and 180),
  constraint zonas_clima_distrito_o_centro check (distrito is not null or centro_poblado is not null)
);

drop trigger if exists zonas_clima_set_updated_at on public.zonas_clima;
create trigger zonas_clima_set_updated_at
before update on public.zonas_clima
for each row execute function public.set_updated_at();

alter table public.zonas_clima enable row level security;

-- Lectura: cualquier usuario con sesión.
drop policy if exists zonas_clima_select_authenticated on public.zonas_clima;
create policy zonas_clima_select_authenticated on public.zonas_clima
for select to authenticated
using (true);

-- Escritura: solo el superadministrador.
drop policy if exists zonas_clima_insert_admin on public.zonas_clima;
create policy zonas_clima_insert_admin on public.zonas_clima
for insert to authenticated
with check (public.is_superadministrador());

drop policy if exists zonas_clima_update_admin on public.zonas_clima;
create policy zonas_clima_update_admin on public.zonas_clima
for update to authenticated
using (public.is_superadministrador())
with check (public.is_superadministrador());

drop policy if exists zonas_clima_delete_admin on public.zonas_clima;
create policy zonas_clima_delete_admin on public.zonas_clima
for delete to authenticated
using (public.is_superadministrador());
