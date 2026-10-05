CREATE OR REPLACE FUNCTION public.validate_zone_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Время окончания должно быть позже времени начала';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time)
     AND NEW.start_time < now() THEN
    RAISE EXCEPTION 'Нельзя отправить заявку на прошедшее время';
  END IF;
  IF NEW.end_time > NEW.start_time + interval '8 hours' THEN
    RAISE EXCEPTION 'Максимальная длительность заявки — 8 часов';
  END IF;
  IF NEW.participant_count < 1 OR NEW.participant_count > 100 THEN
    RAISE EXCEPTION 'Укажите от 1 до 100 участников';
  END IF;
  IF NEW.status IN ('pending', 'active') AND EXISTS (
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