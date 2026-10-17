CREATE TABLE public.learning_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, title_kz text, title_en text,
  summary text, summary_kz text, summary_en text,
  content text, content_kz text, content_en text,
  cover_url text, video_url text, pdf_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_guides TO authenticated;
GRANT ALL ON public.learning_guides TO service_role;
ALTER TABLE public.learning_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides public read" ON public.learning_guides FOR SELECT USING (is_published OR public.check_if_admin());
CREATE POLICY "guides admin write" ON public.learning_guides FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());

CREATE TABLE public.learning_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, title_kz text, title_en text,
  description text, description_kz text, description_en text,
  image_url text,
  mentor_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_skills TO authenticated;
GRANT ALL ON public.learning_skills TO service_role;
ALTER TABLE public.learning_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills public read" ON public.learning_skills FOR SELECT USING (is_published OR public.check_if_admin());
CREATE POLICY "skills admin write" ON public.learning_skills FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());

CREATE TABLE public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'workshop',
  skill_id uuid REFERENCES public.learning_skills(id) ON DELETE SET NULL,
  title text NOT NULL, title_kz text, title_en text,
  description text, description_kz text, description_en text,
  cover_url text,
  host_name text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_events TO authenticated;
GRANT ALL ON public.learning_events TO service_role;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read" ON public.learning_events FOR SELECT USING (is_published OR public.check_if_admin());
CREATE POLICY "events admin write" ON public.learning_events FOR ALL TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());

CREATE TABLE public.learning_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.learning_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, DELETE ON public.learning_registrations TO authenticated;
GRANT ALL ON public.learning_registrations TO service_role;
ALTER TABLE public.learning_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read regs" ON public.learning_registrations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.check_if_admin());
CREATE POLICY "own or admin delete regs" ON public.learning_registrations FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.check_if_admin());

CREATE OR REPLACE FUNCTION public.learning_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_guides_upd BEFORE UPDATE ON public.learning_guides FOR EACH ROW EXECUTE FUNCTION public.learning_touch();
CREATE TRIGGER t_skills_upd BEFORE UPDATE ON public.learning_skills FOR EACH ROW EXECUTE FUNCTION public.learning_touch();
CREATE TRIGGER t_events_upd BEFORE UPDATE ON public.learning_events FOR EACH ROW EXECUTE FUNCTION public.learning_touch();

CREATE OR REPLACE FUNCTION public.get_learning_seats()
RETURNS TABLE(event_id uuid, taken integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.event_id, count(*)::int FROM public.learning_registrations r GROUP BY r.event_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_learning_seats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_for_learning_event(_event_id uuid)
RETURNS public.learning_registrations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ev public.learning_events;
  v_taken int;
  v_reg public.learning_registrations;
  v_p public.profiles;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = v_uid;
  IF v_p.id IS NULL OR v_p.is_banned OR v_p.approval_status <> 'approved' THEN RAISE EXCEPTION 'not_approved'; END IF;
  SELECT * INTO v_ev FROM public.learning_events WHERE id = _event_id AND is_published FOR UPDATE;
  IF v_ev.id IS NULL THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF v_ev.end_time < now() THEN RAISE EXCEPTION 'event_finished'; END IF;
  SELECT * INTO v_reg FROM public.learning_registrations WHERE event_id = _event_id AND user_id = v_uid;
  IF v_reg.id IS NOT NULL THEN RETURN v_reg; END IF;
  SELECT count(*) INTO v_taken FROM public.learning_registrations WHERE event_id = _event_id;
  IF v_taken >= v_ev.capacity THEN RAISE EXCEPTION 'no_seats'; END IF;
  INSERT INTO public.learning_registrations(event_id, user_id, ticket_code)
  VALUES (_event_id, v_uid, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
  RETURNING * INTO v_reg;
  PERFORM public.notify_telegram(
    '🎓 <b>Новая запись на обучение</b>' || chr(10) ||
    '<b>' || public.tg_esc(v_ev.title) || '</b>' || chr(10) ||
    '🗓 ' || public.tg_fmt_dt(v_ev.start_time) || chr(10) ||
    '👤 ' || public.tg_esc(v_p.name) || coalesce(' · ' || public.tg_esc(v_p.contact_phone), '') || coalesce(' · ' || public.tg_esc(v_p.contact_telegram), '') || chr(10) ||
    '🎟 Билет: ' || v_reg.ticket_code || chr(10) ||
    '🪑 Мест занято: ' || (v_taken + 1) || ' / ' || v_ev.capacity
  );
  RETURN v_reg;
END; $$;
REVOKE ALL ON FUNCTION public.register_for_learning_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_learning_event(uuid) TO authenticated;

CREATE POLICY "learning files read" ON storage.objects FOR SELECT USING (bucket_id = 'learning-files');
CREATE POLICY "learning files admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'learning-files' AND public.check_if_admin());
CREATE POLICY "learning files admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'learning-files' AND public.check_if_admin());
CREATE POLICY "learning files admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'learning-files' AND public.check_if_admin());