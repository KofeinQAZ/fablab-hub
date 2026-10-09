REVOKE EXECUTE ON FUNCTION public.notify_print_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.print_queue_position(uuid) FROM PUBLIC, anon;