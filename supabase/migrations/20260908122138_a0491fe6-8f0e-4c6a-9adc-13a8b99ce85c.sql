
CREATE OR REPLACE FUNCTION public.notify_telegram(p_message text, p_buttons jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_secret text;
  v_url text := 'https://ifgcxlijwjqvnekpcrkx.supabase.co/functions/v1/notify-telegram';
  v_body jsonb;
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

  v_body := jsonb_build_object('message', p_message);
  IF p_buttons IS NOT NULL AND jsonb_array_length(p_buttons) > 0 THEN
    v_body := v_body || jsonb_build_object('buttons', p_buttons);
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret
    ),
    body := v_body,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_telegram failed: %', SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_telegram(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text; v_equipment text; v_msg text;
  v_role text; v_phone text; v_email text;
  v_buttons jsonb := '[]'::jsonb;
BEGIN
  SELECT p.name, p.role::text, p.contact_phone, coalesce(u.email, p.contact_email)
    INTO v_name, v_role, v_phone, v_email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.user_id;

  SELECT name INTO v_equipment FROM public.equipment WHERE id = NEW.equipment_id;

  IF NEW.status = 'active' THEN
    v_msg := '🎉 НОВАЯ АВТОБРОНЬ!' || E'\n' || '(Зарегистрировано автоматически)' || E'\n\n'
      || '📌 Категория: 🟢 Простая бронь (Общий доступ)'
      || E'\n' || '👤 Студент: ' || tg_esc(v_name)
      || E'\n' || '🔧 Оборудование: ' || tg_esc(v_equipment)
      || E'\n' || '🕐 Время начала: ' || tg_fmt_dt(NEW.start_time)
      || E'\n' || '🕐 Время конца: ' || tg_fmt_dt(NEW.end_time);
    PERFORM public.notify_telegram(v_msg);
    RETURN NEW;
  ELSIF NEW.status = 'pending' THEN
    v_msg := '🚨 ПОСТУПИЛА ЗАЯВКА НА БРОНИРОВАНИЕ!' || E'\n' || '(Требует подтверждения в админке)' || E'\n\n'
      || '📌 Категория: ⚠️ ТРЕБУЕТСЯ МЕНТОР'
      || E'\n' || '👤 Студент: ' || tg_esc(v_name)
      || E'\n' || '🎓 Роль: ' || CASE v_role
            WHEN 'student' THEN 'Студент'
            WHEN 'resident' THEN 'Резидент'
            WHEN 'staff' THEN 'Сотрудник'
            WHEN 'admin' THEN 'Администратор'
            ELSE coalesce(v_role, '—') END
      || E'\n' || '📱 Телефон: ' || tg_esc(v_phone)
      || E'\n' || '📧 Email: ' || tg_esc(v_email)
      || E'\n' || '🔧 Оборудование: ' || tg_esc(v_equipment)
      || E'\n' || '🕐 Время начала: ' || tg_fmt_dt(NEW.start_time)
      || E'\n' || '🕐 Время конца: ' || tg_fmt_dt(NEW.end_time);

    IF v_phone IS NOT NULL AND length(trim(v_phone)) > 0 THEN
      v_buttons := v_buttons || jsonb_build_object(
        'text', '💬 WhatsApp',
        'url', 'https://wa.me/' || regexp_replace(v_phone, '[^0-9]', '', 'g')
      );
    END IF;

    v_buttons := v_buttons || jsonb_build_object(
      'text', '🔧 Открыть в админке',
      'url', 'https://satbayev-fablab.com/admin/bookings'
    );

    PERFORM public.notify_telegram(v_msg, v_buttons);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_pending_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  PERFORM public.notify_telegram(v_msg, jsonb_build_array(jsonb_build_object(
    'text', '👥 Открыть в админке',
    'url', 'https://satbayev-fablab.com/admin/users'
  )));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  PERFORM public.notify_telegram(v_msg, jsonb_build_array(jsonb_build_object(
    'text', '🚀 Открыть в админке',
    'url', 'https://satbayev-fablab.com/admin/projects'
  )));
  RETURN NEW;
END;
$function$;
