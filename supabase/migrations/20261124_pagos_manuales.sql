-- Comprobantes de pago manual (Yape / transferencia) para activar Premium.

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  referencia text not null,
  monto numeric(10, 2) not null check (monto > 0),
  metodo text not null check (metodo in ('yape', 'transfer')),
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size > 0),
  receipt_name text not null,
  estado text not null default 'en_revision'
    check (estado in ('en_revision', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  revisado_por uuid references public.profiles (id) on delete set null,
  revisado_en timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (referencia)
);

create index if not exists pagos_profile_id_idx on public.pagos (profile_id);
create index if not exists pagos_estado_idx on public.pagos (estado);
create index if not exists pagos_created_at_idx on public.pagos (created_at desc);

alter table public.pagos enable row level security;

drop policy if exists pagos_select_own_or_admin on public.pagos;
create policy pagos_select_own_or_admin on public.pagos
for select to authenticated
using (profile_id = auth.uid() or public.is_superadministrador());

drop policy if exists pagos_insert_own on public.pagos;
create policy pagos_insert_own on public.pagos
for insert to authenticated
with check (profile_id = auth.uid());

-- Updates de estado los hace el service role desde el panel.
