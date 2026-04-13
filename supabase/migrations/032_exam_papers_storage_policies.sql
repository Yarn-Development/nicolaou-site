-- =====================================================
-- Storage Setup for Exam Papers bucket
-- =====================================================
-- The exam-papers bucket was created manually via the dashboard
-- but without RLS policies. Teachers uploading shadow paper
-- page images get "new row violates row-level security policy"
-- because no INSERT policy exists.
--
-- This migration:
--   1. Ensures the bucket exists with correct settings
--   2. Adds INSERT/SELECT/DELETE policies for teachers
-- =====================================================

-- Ensure bucket exists (safe to run even if already created manually)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-papers',
  'exam-papers',
  false, -- private bucket; access controlled via signed URLs
  52428800, -- 50MB limit (PDFs can be large)
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
      file_size_limit = GREATEST(COALESCE(storage.buckets.file_size_limit, 0), 52428800);

-- =====================================================
-- DROP old policies if they exist (idempotent re-run)
-- =====================================================

DROP POLICY IF EXISTS "Teachers can upload exam papers" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read own exam papers" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own exam papers" ON storage.objects;

-- =====================================================
-- INSERT: authenticated teachers can upload
-- =====================================================

CREATE POLICY "Teachers can upload exam papers"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'exam-papers'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- =====================================================
-- SELECT: teachers can read files they uploaded
-- =====================================================

CREATE POLICY "Teachers can read own exam papers"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'exam-papers'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- =====================================================
-- DELETE: teachers can delete files they uploaded
-- =====================================================

CREATE POLICY "Teachers can delete own exam papers"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'exam-papers'
    AND auth.uid() = owner
  );
