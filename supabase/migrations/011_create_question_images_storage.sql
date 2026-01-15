-- =====================================================
-- Storage Setup for Question Images
-- =====================================================
-- Creates storage bucket and policies for OCR question images
-- =====================================================

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images',
  true,  -- Public read access
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Allow authenticated teachers to upload images
CREATE POLICY "Teachers can upload question images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'question-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policy: Allow public read access to question images
CREATE POLICY "Public can read question images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');

-- Policy: Teachers can update their own uploaded images
CREATE POLICY "Teachers can update own question images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'question-images'
    AND auth.uid() = owner
  )
  WITH CHECK (
    bucket_id = 'question-images'
    AND auth.uid() = owner
  );

-- Policy: Teachers can delete their own uploaded images
CREATE POLICY "Teachers can delete own question images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'question-images'
    AND auth.uid() = owner
  );

-- =====================================================
-- HELPER FUNCTION FOR IMAGE URL GENERATION
-- =====================================================

-- Function to get public URL for a question image
CREATE OR REPLACE FUNCTION public.get_question_image_url(image_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CONCAT(
    current_setting('app.settings.supabase_url', true),
    '/storage/v1/object/public/question-images/',
    image_path
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_question_image_url(text) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.get_question_image_url IS 'Generates public URL for question images stored in question-images bucket';
