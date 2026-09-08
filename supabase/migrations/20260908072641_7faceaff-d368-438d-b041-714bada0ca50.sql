create or replace function public.force_profile_approval_status()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  user_email text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select email into user_email from auth.users where id = new.id;

  if lower(coalesce(user_email, '')) like '%@stud.satbayev.university' then
    new.approval_status := 'approved';
  else
    new.approval_status := 'pending_admin';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_force_profile_approval_status on public.profiles;
create trigger trg_force_profile_approval_status
  before insert on public.profiles
  for each row execute function public.force_profile_approval_status();