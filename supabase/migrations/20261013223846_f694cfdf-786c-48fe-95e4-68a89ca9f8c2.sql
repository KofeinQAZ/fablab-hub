CREATE OR REPLACE FUNCTION public.protect_moderation_flags() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.check_if_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := false; NEW.is_rejected := false;
  ELSE
    NEW.is_approved := OLD.is_approved; NEW.is_rejected := OLD.is_rejected;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_moderation_flags() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS clubs_protect_moderation ON public.clubs;
CREATE TRIGGER clubs_protect_moderation BEFORE INSERT OR UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.protect_moderation_flags();

DROP TRIGGER IF EXISTS projects_protect_moderation ON public.projects;
CREATE TRIGGER projects_protect_moderation BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.protect_moderation_flags();