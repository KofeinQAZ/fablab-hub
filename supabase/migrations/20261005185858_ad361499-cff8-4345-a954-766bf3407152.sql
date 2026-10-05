CREATE TYPE public.lab_zone_action AS ENUM ('info', 'bookable', 'external');

CREATE TABLE public.lab_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_kz text,
  name_en text,
  description text,
  description_kz text,
  description_en text,
  action_type public.lab_zone_action NOT NULL DEFAULT 'info',
  external_url text,
  image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  booking_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lab_zones TO authenticated;
GRANT ALL ON public.lab_zones TO service_role;
ALTER TABLE public.lab_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active lab zones" ON public.lab_zones FOR SELECT TO anon, authenticated USING (is_active OR public.check_if_admin());
CREATE POLICY "Admins can create lab zones" ON public.lab_zones FOR INSERT TO authenticated WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins can update lab zones" ON public.lab_zones FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins can delete lab zones" ON public.lab_zones FOR DELETE TO authenticated USING (public.check_if_admin());

CREATE TABLE public.zone_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.lab_zones(id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  topic text NOT NULL,
  event_format text,
  participant_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.zone_bookings TO authenticated;
GRANT UPDATE, DELETE ON public.zone_bookings TO authenticated;
GRANT ALL ON public.zone_bookings TO service_role;
ALTER TABLE public.zone_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own zone bookings" ON public.zone_bookings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.check_if_admin());
CREATE POLICY "Approved users create own zone bookings" ON public.zone_bookings FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND public.check_if_approved()
  AND NOT public.check_if_banned()
  AND EXISTS (SELECT 1 FROM public.lab_zones z WHERE z.id = zone_id AND z.is_active AND z.action_type = 'bookable' AND z.booking_enabled)
);
CREATE POLICY "Admins update zone bookings" ON public.zone_bookings FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins delete zone bookings" ON public.zone_bookings FOR DELETE TO authenticated USING (public.check_if_admin());

CREATE OR REPLACE FUNCTION public.set_lab_map_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_lab_zones_updated_at BEFORE UPDATE ON public.lab_zones FOR EACH ROW EXECUTE FUNCTION public.set_lab_map_updated_at();
CREATE TRIGGER set_zone_bookings_updated_at BEFORE UPDATE ON public.zone_bookings FOR EACH ROW EXECUTE FUNCTION public.set_lab_map_updated_at();

CREATE OR REPLACE FUNCTION public.validate_zone_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Время окончания должно быть позже времени начала';
  END IF;
  IF NEW.start_time < now() THEN
    RAISE EXCEPTION 'Нельзя отправить заявку на прошедшее время';
  END IF;
  IF NEW.end_time > NEW.start_time + interval '8 hours' THEN
    RAISE EXCEPTION 'Максимальная длительность заявки — 8 часов';
  END IF;
  IF NEW.participant_count < 1 OR NEW.participant_count > 100 THEN
    RAISE EXCEPTION 'Укажите от 1 до 100 участников';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.zone_bookings b
    WHERE b.zone_id = NEW.zone_id
      AND b.id <> NEW.id
      AND b.status IN ('pending', 'active')
      AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) THEN
    RAISE EXCEPTION 'Это время уже занято';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_zone_booking_before_write BEFORE INSERT OR UPDATE OF zone_id, start_time, end_time, status, participant_count ON public.zone_bookings FOR EACH ROW EXECUTE FUNCTION public.validate_zone_booking();

CREATE OR REPLACE FUNCTION public.notify_new_zone_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  zone_name text;
  user_name text;
BEGIN
  SELECT name INTO zone_name FROM public.lab_zones WHERE id = NEW.zone_id;
  SELECT name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_telegram(
    '<b>Новая заявка на зону</b>' || E'\n' ||
    'Зона: ' || coalesce(zone_name, 'FabLab') || E'\n' ||
    'Пользователь: ' || coalesce(user_name, 'Неизвестно') || E'\n' ||
    'Тема: ' || NEW.topic || E'\n' ||
    'Участников: ' || NEW.participant_count::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Telegram notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_new_zone_booking_after_insert AFTER INSERT ON public.zone_bookings FOR EACH ROW EXECUTE FUNCTION public.notify_new_zone_booking();

INSERT INTO public.lab_zones (slug, name, name_kz, name_en, description, description_kz, description_en, action_type, external_url, booking_enabled, sort_order) VALUES
('electronics', 'Электроника и батареи', 'Электроника және батареялар', 'Electronics & batteries', 'Зона пайки, сборки электроники, тестирования компонентов и работы с источниками питания.', 'Электрониканы дәнекерлеу, құрастыру, компоненттер мен қуат көздерін сынау аймағы.', 'A zone for soldering, electronics assembly, component testing and power systems.', 'info', NULL, false, 10),
('instrumentals', 'Инструментальная зона', 'Аспаптар аймағы', 'Instrumental zone', 'Рабочая зона с ручным инструментом для сборки, ремонта и прототипирования.', 'Құрастыру, жөндеу және прототиптеуге арналған қол аспаптары бар жұмыс аймағы.', 'A hands-on area with tools for assembly, repair and prototyping.', 'info', NULL, false, 20),
('3d-print', 'Зона 3D-печати', '3D-баспа аймағы', '3D printing zone', 'FDM-печать и подготовка цифровых моделей для быстрых прототипов.', 'Жылдам прототиптерге арналған FDM-баспа және цифрлық модельдерді дайындау.', 'FDM printing and digital model preparation for rapid prototypes.', 'info', NULL, false, 30),
('machine-1', 'Станок 1', 'Станок 1', 'Machine 1', 'Промышленное оборудование FabLab. Название и паспорт станка уточняются администратором.', 'FabLab өнеркәсіптік жабдығы. Атауы мен паспорты әкімшімен нақтыланады.', 'FabLab industrial equipment. Its name and specifications can be updated by an administrator.', 'info', NULL, false, 40),
('machine-2', 'Станок 2', 'Станок 2', 'Machine 2', 'Промышленное оборудование FabLab. Название и паспорт станка уточняются администратором.', 'FabLab өнеркәсіптік жабдығы. Атауы мен паспорты әкімшімен нақтыланады.', 'FabLab industrial equipment. Its name and specifications can be updated by an administrator.', 'info', NULL, false, 50),
('machine-3', 'Станок 3', 'Станок 3', 'Machine 3', 'Промышленное оборудование FabLab. Название и паспорт станка уточняются администратором.', 'FabLab өнеркәсіптік жабдығы. Атауы мен паспорты әкімшімен нақтыланады.', 'FabLab industrial equipment. Its name and specifications can be updated by an administrator.', 'info', NULL, false, 60),
('workshops', 'Воркшопы и курсы', 'Воркшоптар мен курстар', 'Workshops & courses', 'Трансформируемая зона со столами для практических занятий, открытых лекций, командной работы и презентаций проектов.', 'Практикалық сабақтарға, ашық дәрістерге, топтық жұмысқа және жоба таныстырылымдарына арналған икемді аймақ.', 'A flexible table area for hands-on sessions, open lectures, teamwork and project presentations.', 'bookable', NULL, true, 70),
('computer-bars', 'Компьютерные места', 'Компьютерлік орындар', 'Computer bars', 'Барные рабочие места с компьютерами. Можно прийти поработать над моделью, кодом или проектом без бронирования.', 'Компьютерлері бар жұмыс орындары. Модель, код немесе жоба бойынша броньсыз жұмыс істеуге болады.', 'Walk-in computer workstations for models, code and project work. No booking required.', 'info', NULL, false, 80),
('office', 'Офис', 'Кеңсе', 'Office', 'Рабочая зона команды лаборатории.', 'Зертхана командасының жұмыс аймағы.', 'The laboratory team workspace.', 'info', NULL, false, 90),
('storage', 'Склад', 'Қойма', 'Storage', 'Служебная зона хранения материалов и оборудования.', 'Материалдар мен жабдықтарды сақтайтын қызметтік аймақ.', 'A staff-only storage area for materials and equipment.', 'info', NULL, false, 100),
('dmark', 'Dmark', 'Dmark', 'Dmark', 'Зона компании Dmark. Нажмите, чтобы перейти на сайт компании.', 'Dmark компаниясының аймағы. Компания сайтына өту үшін басыңыз.', 'Dmark company zone. Select it to visit the company website.', 'external', 'https://new.dmark.kz', false, 110)
ON CONFLICT (slug) DO NOTHING;