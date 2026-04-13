-- =====================================================
-- Allow image uploads in exam-papers bucket
-- =====================================================
-- The shadow paper pipeline converts PDF pages to PNG images
-- client-side (PDF.js) and uploads them to this bucket for
-- OCR processing. Without these MIME types in the bucket's
-- allow-list the upload fails with "mime type not supported".
-- =====================================================

DO $$
DECLARE
  mime_type text;
  types_to_add text[] := ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
BEGIN
  -- Only modify if the bucket exists and has a non-null allowed_mime_types
  -- (NULL means unrestricted — no change needed in that case)
  FOR mime_type IN SELECT unnest(types_to_add) LOOP
    UPDATE storage.buckets
    SET allowed_mime_types = array_append(allowed_mime_types, mime_type)
    WHERE id = 'exam-papers'
      AND allowed_mime_types IS NOT NULL
      AND NOT (mime_type = ANY(allowed_mime_types));
  END LOOP;
END $$;
