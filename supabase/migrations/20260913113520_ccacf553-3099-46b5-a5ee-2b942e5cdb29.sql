
ALTER TABLE public.project_updates ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Public read for image buckets
CREATE POLICY "Public read image buckets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('avatars','project-covers','club-covers','devlog-images','equipment-images'));

-- Users manage files inside their own folder (first path segment = auth.uid())
CREATE POLICY "Users upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins manage everything in image buckets
CREATE POLICY "Admins manage image buckets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images','equipment-images')
  AND public.check_if_admin()
)
WITH CHECK (
  bucket_id IN ('avatars','project-covers','club-covers','devlog-images','equipment-images')
  AND public.check_if_admin()
);
