CREATE TYPE public.club_member_role AS ENUM ('captain', 'moderator', 'member');

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_kz text,
  title_en text,
  description text NOT NULL DEFAULT '',
  description_kz text,
  description_en text,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  meeting_schedule text,
  is_recruiting boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  is_rejected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;

CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.club_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT ON public.club_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;

CREATE TABLE public.club_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter text,
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_applications TO authenticated;
GRANT ALL ON public.club_applications TO service_role;

CREATE TABLE public.club_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text,
  content text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  is_achievement boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_updates TO authenticated;
GRANT ALL ON public.club_updates TO service_role;

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT ON public.project_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

ALTER TABLE public.project_updates ADD COLUMN IF NOT EXISTS is_achievement boolean NOT NULL DEFAULT false;
ALTER TABLE public.project_updates ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_club_moderator(_club_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club_id AND c.author_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club_id AND m.user_id = _user_id AND m.role IN ('captain','moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_captain(_club_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club_id AND c.author_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club_id AND m.user_id = _user_id AND m.role = 'captain'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.author_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.author_id, 'captain')
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_club_created
AFTER INSERT ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.handle_new_club();

CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_applications_updated_at
BEFORE UPDATE ON public.club_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved clubs are public" ON public.clubs FOR SELECT USING (is_approved = true);
CREATE POLICY "Authors and admins see own clubs" ON public.clubs FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.check_if_admin());
CREATE POLICY "Users create clubs" ON public.clubs FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Moderators update clubs" ON public.clubs FOR UPDATE TO authenticated USING (public.is_club_moderator(id, auth.uid()) OR public.check_if_admin()) WITH CHECK (public.is_club_moderator(id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Captain or admin delete clubs" ON public.clubs FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.check_if_admin());

CREATE POLICY "Club members are public" ON public.club_members FOR SELECT USING (true);
CREATE POLICY "Moderators add members" ON public.club_members FOR INSERT TO authenticated WITH CHECK (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Captain updates members" ON public.club_members FOR UPDATE TO authenticated USING (public.is_club_captain(club_id, auth.uid()) OR public.check_if_admin()) WITH CHECK (public.is_club_captain(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Leave or remove members" ON public.club_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_club_captain(club_id, auth.uid()) OR public.check_if_admin());

CREATE POLICY "See own or managed club applications" ON public.club_applications FOR SELECT TO authenticated USING (applicant_id = auth.uid() OR public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Users apply to clubs" ON public.club_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Moderators review club applications" ON public.club_applications FOR UPDATE TO authenticated USING (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin()) WITH CHECK (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Delete own club application" ON public.club_applications FOR DELETE TO authenticated USING (applicant_id = auth.uid() OR public.check_if_admin());

CREATE POLICY "Club updates are public" ON public.club_updates FOR SELECT USING (true);
CREATE POLICY "Moderators write club updates" ON public.club_updates FOR INSERT TO authenticated WITH CHECK (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Moderators edit club updates" ON public.club_updates FOR UPDATE TO authenticated USING (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin()) WITH CHECK (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Moderators delete club updates" ON public.club_updates FOR DELETE TO authenticated USING (public.is_club_moderator(club_id, auth.uid()) OR public.check_if_admin());

CREATE POLICY "Project members are public" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "Owner adds project members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (public.is_project_owner(project_id, auth.uid()) OR public.check_if_admin());
CREATE POLICY "Leave or remove project members" ON public.project_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()) OR public.check_if_admin());