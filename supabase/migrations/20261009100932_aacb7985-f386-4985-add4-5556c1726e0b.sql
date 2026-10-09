CREATE OR REPLACE FUNCTION public.get_zone_busy_slots(p_zone_id uuid, p_day date)
RETURNS TABLE (start_time timestamptz, end_time timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT b.start_time, b.end_time
  FROM public.zone_bookings b
  WHERE b.zone_id = p_zone_id
    AND b.status IN ('pending', 'active')
    AND (b.start_time::date = p_day OR b.end_time::date = p_day)
  ORDER BY b.start_time;
$$;

REVOKE ALL ON FUNCTION public.get_zone_busy_slots(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_zone_busy_slots(uuid, date) TO authenticated;
