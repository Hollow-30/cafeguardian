-- El registro público no puede autoasignarse Superadministrador.
-- Solo un INSERT/UPDATE con service role (script o SQL) puede dejar el rol en app_metadata.

create or replace function public.enforce_public_caficultor_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'role' then
    new.raw_user_meta_data := new.raw_user_meta_data - 'role';
  end if;

  if coalesce(new.raw_app_meta_data->>'role', '') = '' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'caficultor');
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_public_caficultor_role on auth.users;

create trigger enforce_public_caficultor_role
before insert or update on auth.users
for each row
execute function public.enforce_public_caficultor_role();

-- Asignar Superadministrador a una cuenta ya existente (cambia el correo y ejecuta).
-- No escribe contraseñas.
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || jsonb_build_object('role', 'superadministrador')
-- where email = 'REEMPLAZA@correo.com';
