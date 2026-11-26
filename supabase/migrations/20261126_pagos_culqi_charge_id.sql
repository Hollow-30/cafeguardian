-- Identificador de cargo Culqi para conciliación / webhook (idempotente).

alter table public.pagos
  add column if not exists culqi_charge_id text;

create unique index if not exists pagos_culqi_charge_id_uidx
  on public.pagos (culqi_charge_id)
  where culqi_charge_id is not null;
