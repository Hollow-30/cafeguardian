-- Notas de historial en fotos + catálogo de planes (idempotente, sin depender solo del seed).

alter table public.fotos
  add column if not exists nota text;

insert into public.planes (id, codigo, nombre, dias_duracion, activo)
values
  ('11111111-1111-4111-8111-111111111111', 'prueba_30', 'Plan de prueba 30 días', 30, true),
  ('22222222-2222-4222-8222-222222222222', 'basico_anual', 'Plan básico anual', 365, true)
on conflict (codigo) do update
set nombre = excluded.nombre,
    dias_duracion = excluded.dias_duracion,
    activo = excluded.activo;
