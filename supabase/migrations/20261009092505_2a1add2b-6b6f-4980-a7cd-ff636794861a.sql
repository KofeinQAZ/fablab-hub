CREATE TABLE public.print_request_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.print_requests(id) ON DELETE CASCADE,
  stl_path text NOT NULL,
  file_name text NOT NULL,
  volume_cm3 numeric,
  est_grams numeric,
  est_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.print_request_files TO authenticated;
GRANT ALL ON public.print_request_files TO service_role;
ALTER TABLE public.print_request_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view files of own requests" ON public.print_request_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.print_requests pr WHERE pr.id = request_id AND pr.user_id = auth.uid()));
CREATE POLICY "Users can add files to own requests" ON public.print_request_files FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.print_requests pr WHERE pr.id = request_id AND pr.user_id = auth.uid()));
CREATE POLICY "Admins can manage all request files" ON public.print_request_files FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());