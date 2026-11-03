-- Extiende fotos para historial (resultado, confianza, semáforo del día) y borrado seguro.

alter table public.fotos
  add column if not exists content_type text,
  add column if not exists byte_size integer,
  add column if not exists resultado_etiqueta text,
  add column if not exists confianza numeric(5, 4)
    check (confianza is null or (confianza >= 0 and confianza <= 1)),
  add column if not exists semaforo_dia text,
  add column if not exists semaforo_fecha date;

alter table public.fotos
  drop constraint if exists fotos_byte_size_nonneg;

alter table public.fotos
  add constraint fotos_byte_size_nonneg check (byte_size is null or byte_size >= 0);

-- Borrado: dueño o superadministrador
drop policy if exists fotos_delete_own_or_admin on public.fotos;
create policy fotos_delete_own_or_admin on public.fotos
for delete to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());
