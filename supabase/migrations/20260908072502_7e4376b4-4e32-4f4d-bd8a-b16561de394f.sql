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
      'Доступ открыт',
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