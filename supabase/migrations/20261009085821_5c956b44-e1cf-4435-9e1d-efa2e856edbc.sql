CREATE TABLE public.print_zone_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  description text, description_kz text, description_en text,
  cover_url text,
  priority_price numeric NOT NULL DEFAULT 2000,
  queue_enabled boolean NOT NULL DEFAULT true,
  priority_enabled boolean NOT NULL DEFAULT true,
  contact_text text, contact_text_kz text, contact_text_en text,
  contact_phone text, contact_telegram text, contact_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.print_zone_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.print_zone_settings TO authenticated;
GRANT ALL ON public.print_zone_settings TO service_role;
ALTER TABLE public.print_zone_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "print settings readable" ON public.print_zone_settings FOR SELECT USING (true);
CREATE POLICY "print settings admin insert" ON public.print_zone_settings FOR INSERT TO authenticated WITH CHECK (public.check_if_admin());
CREATE POLICY "print settings admin update" ON public.print_zone_settings FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
INSERT INTO public.print_zone_settings (id, description, contact_text) VALUES (1,
 'Зона 3D-печати FabLab Satbayev. Бесплатный принтер FabLab работает по общей очереди. Нужно быстрее — печать без очереди на частных принтерах за фиксированную цену.',
 'Нужна полная проектировка модели и печать проекта под ключ? Свяжитесь с нами.');

CREATE TABLE public.print_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role_title text, role_title_kz text, role_title_en text,
  photo_url text, contact text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.print_mentors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.print_mentors TO authenticated;
GRANT ALL ON public.print_mentors TO service_role;
ALTER TABLE public.print_mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentors readable" ON public.print_mentors FOR SELECT USING (true);
CREATE POLICY "mentors admin manage" ON public.print_mentors FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());

CREATE TABLE public.filaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material text NOT NULL,
  color text NOT NULL,
  color_hex text,
  price_per_gram numeric NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.filaments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.filaments TO authenticated;
GRANT ALL ON public.filaments TO service_role;
ALTER TABLE public.filaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "filaments readable" ON public.filaments FOR SELECT USING (true);
CREATE POLICY "filaments admin manage" ON public.filaments FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
INSERT INTO public.filaments (material, color, color_hex, price_per_gram, sort_order) VALUES
 ('PLA','Белый','#f5f5f5',30,1),('PLA','Чёрный','#111111',30,2),('PETG','Синий','#2563eb',40,3);

CREATE TABLE public.print_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  comment text,
  stl_path text NOT NULL,
  file_name text NOT NULL,
  mode text NOT NULL DEFAULT 'queue' CHECK (mode IN ('queue','priority')),
  material_source text NOT NULL DEFAULT 'own' CHECK (material_source IN ('own','catalog')),
  own_plastic_label text,
  filament_id uuid REFERENCES public.filaments(id) ON DELETE SET NULL,
  grams integer,
  estimated_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','printing','done','rejected','cancelled')),
  admin_comment text,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.print_requests TO authenticated;
GRANT ALL ON public.print_requests TO service_role;
ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own print requests read" ON public.print_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.check_if_admin());
CREATE POLICY "own print requests create" ON public.print_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND is_paid = false);
CREATE POLICY "admin print requests update" ON public.print_requests FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());

CREATE OR REPLACE FUNCTION public.print_requests_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER print_requests_touch BEFORE UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.print_requests_touch();

CREATE OR REPLACE FUNCTION public.print_queue_position(_request_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r.status IN ('pending','approved') AND r.mode = 'queue' THEN
    (SELECT count(*)::int FROM public.print_requests q
      WHERE q.mode = 'queue' AND q.status IN ('pending','approved','printing') AND q.created_at <= r.created_at)
  ELSE NULL END
  FROM public.print_requests r
  WHERE r.id = _request_id AND (r.user_id = auth.uid() OR public.check_if_admin());
$$;
GRANT EXECUTE ON FUNCTION public.print_queue_position(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_print_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, '3D-печать', 'Статус заявки «' || NEW.title || '»: ' || NEW.status, 'print_request');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER print_requests_notify AFTER UPDATE ON public.print_requests FOR EACH ROW EXECUTE FUNCTION public.notify_print_request();

CREATE POLICY "stl owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stl owner or admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stl-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.check_if_admin()));
CREATE POLICY "stl admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stl-files' AND public.check_if_admin());