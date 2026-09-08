create type public.feedback_status as enum ('new','in_review','resolved');

create table public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status public.feedback_status not null default 'new',
  admin_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert on public.feedback_requests to authenticated;
grant update on public.feedback_requests to authenticated;
grant all on public.feedback_requests to service_role;

alter table public.feedback_requests enable row level security;

create policy feedback_insert_own on public.feedback_requests
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'new' and admin_comment is null and not public.check_if_banned());

create policy feedback_select_own_or_admin on public.feedback_requests
  for select to authenticated
  using (auth.uid() = user_id or public.check_if_admin());

create policy feedback_update_admin on public.feedback_requests
  for update to authenticated
  using (public.check_if_admin())
  with check (public.check_if_admin());

create trigger trg_feedback_requests_updated_at
  before update on public.feedback_requests
  for each row execute function public.update_updated_at_column();

create index idx_feedback_requests_user on public.feedback_requests(user_id);
create index idx_feedback_requests_created on public.feedback_requests(created_at desc);