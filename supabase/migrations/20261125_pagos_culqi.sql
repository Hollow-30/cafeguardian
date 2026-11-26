-- Permite registrar cargos reales de Culqi (metodo = culqi).

alter table public.pagos
  drop constraint if exists pagos_metodo_check;

alter table public.pagos
  add constraint pagos_metodo_check
  check (metodo in ('yape', 'transfer', 'culqi', 'culqi_simulado'));
