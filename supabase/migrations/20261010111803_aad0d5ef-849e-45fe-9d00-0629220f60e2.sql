ALTER TABLE public.print_request_files ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.print_queue_stats()
RETURNS TABLE(waiting int, printing int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*) FILTER (WHERE status IN ('pending','approved'))::int,
         count(*) FILTER (WHERE status = 'printing')::int
  FROM public.print_requests WHERE mode = 'queue';
$$;
REVOKE ALL ON FUNCTION public.print_queue_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.print_queue_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_print_request_created(p_request_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  r record; v_name text; v_phone text; v_tg text; v_email text;
  v_fil text; v_files text := ''; f record; n int := 0;
  v_msg text; v_secret text; v_buttons jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO r FROM public.print_requests WHERE id = p_request_id;
  IF r IS NULL OR r.user_id <> auth.uid() OR r.tg_notified THEN RETURN; END IF;
  UPDATE public.print_requests SET tg_notified = true WHERE id = p_request_id;
  SELECT p.name, p.contact_phone, p.contact_telegram, coalesce(u.email, p.contact_email)
    INTO v_name, v_phone, v_tg, v_email
  FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE p.id = r.user_id;
  IF r.material_source = 'catalog' THEN
    SELECT material || ' ' || color || ' (' || price_per_gram || ' ₸/г)' INTO v_fil FROM public.filaments WHERE id = r.filament_id;
  END IF;
  FOR f IN SELECT file_name, volume_cm3, quantity FROM public.print_request_files WHERE request_id = r.id ORDER BY created_at LOOP
    n := n + 1;
    v_files := v_files || E'\n  ' || n || '. ' || replace(replace(f.file_name,'<','&lt;'),'>','&gt;') || ' × ' || f.quantity || ' шт' || coalesce(' — ' || f.volume_cm3 || ' см³', '');
  END LOOP;
  IF n = 0 THEN
    n := 1; v_files := E'\n  1. ' || replace(replace(coalesce(r.file_name,''),'<','&lt;'),'>','&gt;');
  END IF;
  v_msg := '🖨 <b>НОВАЯ ЗАЯВКА НА 3D-ПЕЧАТЬ</b>' || E'\n\n'
    || '📌 <b>Название:</b> ' || replace(replace(r.title,'<','&lt;'),'>','&gt;') || E'\n'
    || '⚡ <b>Режим:</b> ' || CASE WHEN r.mode = 'priority' THEN 'Без очереди (платно)' ELSE 'Бесплатная очередь' END || E'\n\n'
    || '👤 <b>Заказчик:</b> ' || coalesce(replace(replace(v_name,'<','&lt;'),'>','&gt;'), '—') || E'\n'
    || coalesce('📞 ' || v_phone || E'\n', '')
    || coalesce('💬 ' || v_tg || E'\n', '')
    || coalesce('✉️ ' || v_email || E'\n', '')
    || E'\n📦 <b>Модели (' || n || '):</b>' || v_files || E'\n\n'
    || '🧵 <b>Пластик:</b> ' || CASE WHEN r.material_source = 'own'
         THEN 'свой, подпись «' || replace(replace(coalesce(r.own_plastic_label,''),'<','&lt;'),'>','&gt;') || '»'
         ELSE coalesce(v_fil, 'из каталога') END || E'\n'
    || '🔲 <b>Заполнение:</b> ' || coalesce(r.infill::text || '%', '—') || E'\n'
    || coalesce('📐 <b>Объём:</b> ' || r.volume_cm3 || E' см³\n', '')
    || coalesce('⚖️ <b>Вес:</b> ≈ ' || r.est_grams || E' г\n', '')
    || coalesce('⏱ <b>Время:</b> ≈ ' || (r.est_minutes / 60) || ' ч ' || (r.est_minutes % 60) || E' мин\n', '')
    || '💰 <b>К оплате на месте:</b> ' || coalesce(r.estimated_price, 0) || ' ₸'
    || coalesce(E'\n\n📝 <b>Комментарий:</b> ' || replace(replace(r.comment,'<','&lt;'),'>','&gt;'), '');
  IF v_phone IS NOT NULL AND length(regexp_replace(v_phone, '\D', '', 'g')) > 5 THEN
    v_buttons := v_buttons || jsonb_build_array(jsonb_build_object('text','WhatsApp','url','https://wa.me/' || regexp_replace(v_phone, '\D', '', 'g')));
  END IF;
  v_buttons := v_buttons || jsonb_build_array(jsonb_build_object('text','Открыть в админке','url','https://fablab-kit-manager.lovable.app/admin/print-3d'));
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'notify_telegram_secret' LIMIT 1;
  IF v_secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://ifgcxlijwjqvnekpcrkx.supabase.co/functions/v1/notify-telegram',
    headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', v_secret),
    body := jsonb_build_object('message', left(v_msg, 3990), 'buttons', v_buttons, 'chat', 'print')
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_print_request_created failed: %', SQLERRM;
END; $function$;