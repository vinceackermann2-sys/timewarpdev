
-- Fix: Remove SVG from allowed extensions and add user-scoping to email-assets uploads
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;

CREATE POLICY "Authenticated users can upload email assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'email-assets'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND storage.extension(name) IN ('png', 'jpg', 'jpeg', 'gif', 'webp')
  );
