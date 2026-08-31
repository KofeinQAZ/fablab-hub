GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.project_updates TO anon;

CREATE OR REPLACE VIEW public.public_profiles
AS SELECT id, name FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;