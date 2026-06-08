-- Bucket público para logos de academia.
-- Migración idempotente: se puede re-ejecutar sin error.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Cualquiera puede leer logos (bucket público)
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');

-- Sólo usuarios autenticados pueden subir el logo de SU academia
DROP POLICY IF EXISTS "logos_owner_insert" ON storage.objects;
CREATE POLICY "logos_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'academia_id')
  );

-- Sólo usuarios autenticados pueden actualizar el logo de SU academia
DROP POLICY IF EXISTS "logos_owner_update" ON storage.objects;
CREATE POLICY "logos_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'academia_id')
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'academia_id')
  );

-- Necesario para algunos flujos internos de upsert que reemplazan el objeto.
DROP POLICY IF EXISTS "logos_owner_delete" ON storage.objects;
CREATE POLICY "logos_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'academia_id')
  );
