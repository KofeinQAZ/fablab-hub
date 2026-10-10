CREATE OR REPLACE FUNCTION public.get_team_members()
 RETURNS TABLE(id uuid, name text, job_title text, photo_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select p.id, p.name, p.job_title, p.photo_url, p.created_at
  from public.profiles p
  where p.role::text = 'staff'
    and p.is_banned = false
  union all
  select m.id, m.name, m.role_title, m.photo_url, m.created_at
  from public.print_mentors m
  order by created_at asc;
$function$;