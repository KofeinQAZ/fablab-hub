do $$ begin
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending_admin', 'approved', 'rejected');
  end if;
end $$;

alter table public.profiles
  add column if not exists approval_status public.approval_status not null default 'approved';

create or replace function public.check_if_approved()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce((
    select approval_status = 'approved'
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

grant execute on function public.check_if_approved() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  insert into public.profiles (
    id,
    name,
    role,
    contact_email,
    approval_status
  )
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(coalesce(new.email, ''), '@', 1),
        'Пользователь'
      ),
      120
    ),
    'student',
    new.email,
    case
      when lower(coalesce(new.email, '')) like '%@stud.satbayev.university' then 'approved'::public.approval_status
      else 'pending_admin'::public.approval_status
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.protect_profile_system_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or public.check_if_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  if new.role is distinct from old.role
     or new.is_banned is distinct from old.is_banned
     or new.safety_briefing_passed is distinct from old.safety_briefing_passed
     or new.approval_status is distinct from old.approval_status
  then
    raise exception 'System profile fields can only be changed by an administrator';
  end if;

  return new;
end;
$$;

create or replace function public.set_user_approval(target_user_id uuid, new_status public.approval_status)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.check_if_admin() then
    raise exception 'Administrator access required';
  end if;

  update public.profiles
  set approval_status = new_status,
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if new_status = 'approved' then
    insert into public.notifications (user_id, title, message, type)
    values (
      target_user_id,
      'Доступ开 открыт',
      'Ваша заявка одобрена администратором. Доступ к платформе FabLab открыт.',
      'system'
    );
  elsif new_status = 'rejected' then
    insert into public.notifications (user_id, title, message, type)
    values (
      target_user_id,
      'Заявка отклонена',
      'Ваша заявка на доступ к платформе FabLab была отклонена администратором.',
      'system'
    );
  end if;
end;
$$;

grant execute on function public.set_user_approval(uuid, public.approval_status) to authenticated;

drop policy if exists "bookings_insert_secure" on public.bookings;
create policy "bookings_insert_secure" on public.bookings
  for insert to authenticated
  with check ((auth.uid() = user_id) and (not public.check_if_banned()) and public.check_if_approved());

drop policy if exists "access_requests_insert_own" on public.access_requests;
create policy "access_requests_insert_own" on public.access_requests
  for insert to authenticated
  with check ((auth.uid() = user_id) and (status = 'pending'::request_status) and (not public.check_if_banned()) and public.check_if_approved());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ((auth.uid() = author_id) and (is_approved = false) and (is_rejected = false) and (not public.check_if_banned()) and public.check_if_approved());