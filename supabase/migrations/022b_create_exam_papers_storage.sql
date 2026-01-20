-- Storage bucket setup for exam papers
-- This should be run in the Supabase SQL editor or via the dashboard

-- Create the exam-papers bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-papers',
  'exam-papers',
  true,  -- Public so PDFs can be viewed in iframe
  10485760,  -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for exam-papers bucket

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload exam papers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-papers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can view their own exam papers"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-papers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (for PDF viewer in marking interface)
-- This is needed because students and external viewers may need to see the PDF
CREATE POLICY "Public can view exam papers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exam-papers');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own exam papers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-papers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Teachers can view exam papers for their assignments
-- (This is handled at the application level through assignment ownership)
