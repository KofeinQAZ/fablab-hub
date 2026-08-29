ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE (id uuid, name text, job_title text, photo_url text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  select p.id, p.name, p.job_title, p.photo_url, p.created_at
  from public.profiles p
  where p.role::text = 'staff'
    and p.is_banned = false
  order by p.created_at asc;
$$;

REVOKE ALL ON FUNCTION public.get_team_members() FROM public;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO anon, authenticated, service_role;