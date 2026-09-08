CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------
-- Shared sender: every trigger calls this one function.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_telegram(p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_secret text;
  v_url text := 'https://ifgcxlijwjqvnekpcrkx.supabase.co/functions/v1/notify-telegram';
BEGIN
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'notify_telegram_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'notify_telegram: vault secret notify_telegram_secret is missing, skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret
    ),
    body := jsonb_build_object('message', p_message),
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  -- Never break the main flow (booking / signup / etc.)
  RAISE WARNING 'notify_telegram failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_telegram(text) FROM PUBLIC, anon, authenticated;

-- Helpers ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_fmt_dt(ts timestamptz)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(ts AT TIME ZONE 'Asia/Almaty', 'DD.MM.YYYY') || ' в ' || to_char(ts AT TIME ZONE 'Asia/Almaty', 'HH24:MI')
$$;

CREATE OR REPLACE FUNCTION public.tg_esc(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(t, '—'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- a) + b) bookings ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text; v_equipment text; v_msg text;
BEGIN
  SELECT name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT name INTO v_equipment FROM public.equipment WHERE id = NEW.equipment_id;

  IF NEW.status = 'active' THEN
    v_msg := '🎉 НОВАЯ АВТОБРОНЬ!' || E'\n' || '(Зарегистрировано автоматически)' || E'\n\n'
      || '📌 Категория: 🟢 Простая бронь (Общий доступ)';
  ELSIF NEW.status = 'pending' THEN
    v_msg := '🚨 ПОСТУПИЛА ЗАЯВКА НА БРОНИРОВАНИЕ!' || E'\n' || '(Требует подтверждения в админке)' || E'\n\n'
      || '📌 Категория: ⚠️ ТРЕБУЕТСЯ МЕНТОР';
  ELSE
    RETURN NEW;
  END IF;

  v_msg := v_msg || E'\n' || '👤 Студент: ' || tg_esc(v_name)
    || E'\n' || '🔧 Оборудование: ' || tg_esc(v_equipment)
    || E'\n' || '🕐 Время начала: ' || tg_fmt_dt(NEW.start_time)
    || E'\n' || '🕐 Время конца: ' || tg_fmt_dt(NEW.end_time);

  PERFORM public.notify_telegram(v_msg);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_booking_insert ON public.bookings;
CREATE TRIGGER notify_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_booking();

-- c) residency requests (access_requests.type = 'residency') --------
CREATE OR REPLACE FUNCTION public.trg_notify_residency_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text; v_phone text; v_msg text;
BEGIN
  IF NEW.type <> 'residency' THEN
    RETURN NEW;
  END IF;

  SELECT name, contact_phone INTO v_name, v_phone FROM public.profiles WHERE id = NEW.user_id;

  v_msg := '🔔 НОВАЯ ЗАЯВКА В FABLAB!' || E'\n\n'
    || '📌 Тип: 👑 Заявка на Резидентство'
    || E'\n' || '👤 От кого: ' || tg_esc(v_name)
    || E'\n' || '📱 Телефон: ' || tg_esc(v_phone)
    || E'\n' || '📝 Опыт: ' || tg_esc(NEW.description)
    || E'\n' || '🔗 Портфолио: ' || tg_esc(NEW.cv_url);

  PERFORM public.notify_telegram(v_msg);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_residency_request_insert ON public.access_requests;
CREATE TRIGGER notify_residency_request_insert
AFTER INSERT ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_residency_request();

-- d) projects awaiting moderation (is_approved = false) --------------
CREATE OR REPLACE FUNCTION public.trg_notify_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text; v_msg text; v_status text;
BEGIN
  IF NEW.is_approved OR NEW.is_rejected THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_name FROM public.profiles WHERE id = NEW.author_id;
  v_status := CASE NEW.status
    WHEN 'in_progress' THEN 'В разработке'
    WHEN 'completed' THEN 'Завершён'
    WHEN 'paused' THEN 'На паузе'
    ELSE NEW.status::text END;

  v_msg := '🚀 НОВЫЙ ПРОЕКТ НА МОДЕРАЦИЮ!' || E'\n\n'
    || '👤 Автор: ' || tg_esc(v_name)
    || E'\n' || '📛 Название: ' || tg_esc(NEW.title)
    || E'\n' || '⚙️ Статус: ' || v_status
    || E'\n' || '👥 Ищет команду: ' || CASE WHEN NEW.is_looking_for_team THEN 'Да' ELSE 'Нет' END;

  PERFORM public.notify_telegram(v_msg);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_insert ON public.projects;
CREATE TRIGGER notify_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_project();

-- e) feedback_requests -----------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text; v_email text; v_msg text;
BEGIN
  SELECT p.name, coalesce(u.email, p.contact_email)
    INTO v_name, v_email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.user_id;

  v_msg := '💬 НОВОЕ ПРЕДЛОЖЕНИЕ ОТ ПОЛЬЗОВАТЕЛЯ' || E'\n\n'
    || '👤 От: ' || tg_esc(v_name)
    || E'\n' || '📧 Email: ' || tg_esc(v_email)
    || E'\n' || '📝 Текст: ' || tg_esc(left(NEW.message, 3000));

  PERFORM public.notify_telegram(v_msg);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_feedback_insert ON public.feedback_requests;
CREATE TRIGGER notify_feedback_insert
AFTER INSERT ON public.feedback_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_feedback();

-- f) profiles pending admin approval ----------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_pending_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text; v_msg text;
BEGIN
  IF NEW.approval_status <> 'pending_admin' THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(u.email, NEW.contact_email) INTO v_email FROM auth.users u WHERE u.id = NEW.id;

  v_msg := '🔔 НОВАЯ ЗАЯВКА НА РЕГИСТРАЦИЮ' || E'\n\n'
    || '👤 Email: ' || tg_esc(coalesce(v_email, NEW.contact_email))
    || E'\n' || '📛 Имя: ' || tg_esc(NEW.name)
    || E'\n' || 'Требуется одобрение администратора в разделе Резиденты';

  PERFORM public.notify_telegram(v_msg);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_pending_profile_insert ON public.profiles;
CREATE TRIGGER notify_pending_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_pending_profile();