-- Supabase RLS fix for FabLab Hub
-- Tables: public.bookings, public.equipment
--
-- What this script does:
-- 1) Ensures RLS is enabled on both tables
-- 2) Removes existing policies on these tables (to avoid conflicts)
-- 3) Recreates clean policies for user/admin access model

begin;

-- ---------------------------------------------------------------------------
-- 0) Enable RLS
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.equipment enable row level security;

-- ---------------------------------------------------------------------------
-- 1) Drop existing policies on target tables
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'bookings'
  loop
    execute format('drop policy if exists %I on public.bookings', p.policyname);
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'equipment'
  loop
    execute format('drop policy if exists %I on public.equipment', p.policyname);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Helper condition for admin checks
-- ---------------------------------------------------------------------------
-- Admin = user whose profile row has role = 'admin'
-- (profiles.id is auth user id)

-- ---------------------------------------------------------------------------
-- 3) BOOKINGS policies
-- ---------------------------------------------------------------------------

-- Users can SELECT only their own bookings
create policy "bookings_select_own"
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can INSERT new bookings (only for themselves)
create policy "bookings_insert_own"
  on public.bookings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can SELECT all bookings
create policy "bookings_admin_select_all"
  on public.bookings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Admins can UPDATE all bookings
create policy "bookings_admin_update_all"
  on public.bookings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Admins can DELETE all bookings
create policy "bookings_admin_delete_all"
  on public.bookings
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4) EQUIPMENT policies
-- ---------------------------------------------------------------------------

-- Everyone (including anon) can SELECT equipment
create policy "equipment_select_public"
  on public.equipment
  for select
  using (true);

-- Only admins can INSERT equipment
create policy "equipment_admin_insert"
  on public.equipment
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Only admins can UPDATE equipment
create policy "equipment_admin_update"
  on public.equipment
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Only admins can DELETE equipment
create policy "equipment_admin_delete"
  on public.equipment
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

commit;
