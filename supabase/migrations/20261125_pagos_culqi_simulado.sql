-- Permite registrar pagos simulados con Culqi (sin gateway real).

alter table public.pagos
  drop constraint if exists pagos_metodo_check;

alter table public.pagos
  add constraint pagos_metodo_check
  check (metodo in ('yape', 'transfer', 'culqi_simulado'));
