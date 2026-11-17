-- CAFG: al registrarse, el caficultor recibe plan Prueba (prueba_30) por 30 días.
-- Superadministrador no recibe suscripción automática.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role text;
  plan_prueba record;
  inicia date;
  termina date;
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

  if resolved_role = 'caficultor'
     and not exists (
       select 1 from public.suscripciones s where s.profile_id = new.id
     ) then
    select p.id, p.dias_duracion
      into plan_prueba
      from public.planes p
     where p.codigo = 'prueba_30'
       and p.activo = true
     limit 1;

    if plan_prueba.id is not null then
      inicia := (timezone('America/Lima', now()))::date;
      termina := inicia + plan_prueba.dias_duracion;

      insert into public.suscripciones (profile_id, plan_id, estado, inicia_en, termina_en)
      values (new.id, plan_prueba.id, 'activa', inicia, termina);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
