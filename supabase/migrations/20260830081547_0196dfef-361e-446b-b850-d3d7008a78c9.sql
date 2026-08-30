ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS video_url text;