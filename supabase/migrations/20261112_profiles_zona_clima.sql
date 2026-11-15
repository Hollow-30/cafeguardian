-- CAFG-113: zona del catálogo (zonas_clima) que elige cada usuario para ver su semáforo.
-- Reproducible con: psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/migrations/20261112_profiles_zona_clima.sql
-- Requiere las migraciones anteriores (usa profiles y zonas_clima). Se aplica ANTES del merge: la pantalla lee esta columna.

-- Nullable: un usuario sin zona elegida sigue funcionando. Si se borra la zona, queda en null.
alter table public.profiles
  add column if not exists zona_clima_id uuid references public.zonas_clima (id) on delete set null;

-- profiles_update_own deja al dueño cambiar su perfil sin pasar por la ruta de la app.
-- La clave foránea impide ids inventados; este trigger impide además zonas inactivas (sin semáforo).
-- Solo se evalúa cuando se escribe zona_clima_id con un valor: no estorba otros cambios del perfil.
create or replace function public.profiles_validar_zona_clima()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.zonas_clima z where z.id = new.zona_clima_id and z.activo
  ) then
    raise exception 'La zona no existe o no está activa.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_zona_clima_activa on public.profiles;
create trigger profiles_zona_clima_activa
before insert or update of zona_clima_id on public.profiles
for each row
when (new.zona_clima_id is not null)
execute function public.profiles_validar_zona_clima();
