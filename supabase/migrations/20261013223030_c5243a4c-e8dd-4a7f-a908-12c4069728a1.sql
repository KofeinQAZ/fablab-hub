ALTER TABLE public.lab_zones ADD COLUMN IF NOT EXISTS weekly_hours jsonb NOT NULL DEFAULT '[{"day":1,"start":"09:00","end":"21:00"},{"day":2,"start":"09:00","end":"21:00"},{"day":3,"start":"09:00","end":"21:00"},{"day":4,"start":"09:00","end":"21:00"},{"day":5,"start":"09:00","end":"21:00"},{"day":6,"start":"10:00","end":"18:00"}]'::jsonb;

CREATE TABLE public.zone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.lab_zones(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'event',
  is_recurring boolean NOT NULL DEFAULT false,
  event_date date,
  day_of_week integer,
  start_clock time NOT NULL,
  end_clock time NOT NULL,
  repeat_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zone_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zone_events TO authenticated;
GRANT ALL ON public.zone_events TO service_role;
ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view zone events" ON public.zone_events FOR SELECT USING (true);
CREATE POLICY "Admins insert zone events" ON public.zone_events FOR INSERT TO authenticated WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins update zone events" ON public.zone_events FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins delete zone events" ON public.zone_events FOR DELETE TO authenticated USING (public.check_if_admin());

CREATE OR REPLACE FUNCTION public.validate_zone_event() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_clock <= NEW.start_clock THEN RAISE EXCEPTION 'Время окончания должно быть позже начала'; END IF;
  IF NEW.is_recurring AND (NEW.day_of_week IS NULL OR NEW.day_of_week NOT BETWEEN 0 AND 6) THEN RAISE EXCEPTION 'Укажите день недели'; END IF;
  IF NOT NEW.is_recurring AND NEW.event_date IS NULL THEN RAISE EXCEPTION 'Укажите дату'; END IF;
  IF NEW.kind NOT IN ('event','lesson') THEN RAISE EXCEPTION 'Неверный тип'; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER zone_events_validate BEFORE INSERT OR UPDATE ON public.zone_events FOR EACH ROW EXECUTE FUNCTION public.validate_zone_event();