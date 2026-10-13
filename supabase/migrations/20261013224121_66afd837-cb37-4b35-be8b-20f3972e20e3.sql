CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  caption_kz text,
  caption_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible gallery photos are public" ON public.gallery_photos FOR SELECT USING (is_visible OR public.check_if_admin());
CREATE POLICY "Admins insert gallery" ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins update gallery" ON public.gallery_photos FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins delete gallery" ON public.gallery_photos FOR DELETE TO authenticated USING (public.check_if_admin());