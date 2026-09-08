ALTER FUNCTION public.tg_fmt_dt(timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_esc(text) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.trg_notify_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_residency_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_project() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_feedback() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_pending_profile() FROM PUBLIC, anon, authenticated;