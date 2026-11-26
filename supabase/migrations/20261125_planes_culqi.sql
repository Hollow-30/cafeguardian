-- Plan Premium mensual (S/12) + id de plan Culqi opcional.

alter table public.planes
  add column if not exists culqi_plan_id text;

insert into public.planes (id, codigo, nombre, dias_duracion, activo)
values
  ('33333333-3333-4333-8333-333333333333', 'premium_mensual', 'Premium mensual', 30, true)
on conflict (codigo) do update
set
  nombre = excluded.nombre,
  dias_duracion = excluded.dias_duracion,
  activo = excluded.activo;
