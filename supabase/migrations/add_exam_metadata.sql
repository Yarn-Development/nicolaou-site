-- =====================================================
-- Migration: Add Exam Metadata Columns (Safe Migration)
-- Description: Adds nullable columns to support official exam questions
--              alongside existing AI-generated questions
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- Step 0: Fix search vector trigger if it exists
-- =====================================================

-- Drop all triggers that might reference the old function
DROP TRIGGER IF EXISTS questions_search_vector_update ON public.questions;
DROP TRIGGER IF EXISTS trg_questions_search_vector ON public.questions;

-- Drop the old trigger function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS questions_search_vector_trigger() CASCADE;

-- Ensure question_latex column exists (this is the primary column name)
-- If it was renamed, we need to add it back or create an alias
DO $$
BEGIN
    -- Check if question_latex column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'questions' 
        AND column_name = 'question_latex'
    ) THEN
        -- Check if question_content exists (might have been renamed)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'questions' 
            AND column_name = 'question_content'
        ) THEN
            -- Rename question_content back to question_latex
            ALTER TABLE public.questions RENAME COLUMN question_content TO question_latex;
        ELSE
            -- Neither exists, create question_latex
            ALTER TABLE public.questions ADD COLUMN question_latex text;
        END IF;
    END IF;
END $$;

-- =====================================================
-- Step 1: Add NEW NULLABLE columns for exam metadata
-- =====================================================

-- Add exam_board column (nullable - only used for official papers)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS exam_board text;

-- Add level column for curriculum level
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS level text;

-- Add paper_reference column (e.g., "June 2023 Paper 1H")
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS paper_reference text;

-- Add question_number_ref column (e.g., "Q4", "Q12a")
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS question_number_ref text;

-- Add topic_name column if not exists (alias for topic)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS topic_name text;

-- Add times_used and avg_score for tracking
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS times_used integer DEFAULT 0;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS avg_score numeric(5,2);

-- Add verification_notes column
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS verification_notes text;

-- Add meta_tags column for search
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS meta_tags text[];

-- =====================================================
-- Step 2: Ensure content_type has correct values
-- =====================================================

-- Backfill content_type for any rows that might be null
UPDATE public.questions 
SET content_type = 'generated_text' 
WHERE content_type IS NULL;

-- Sync topic_name with topic for existing records
UPDATE public.questions
SET topic_name = topic
WHERE topic_name IS NULL AND topic IS NOT NULL;

-- =====================================================
-- Step 3: Add/Update check constraints
-- =====================================================

-- Drop old constraint if it exists (to update)
ALTER TABLE public.questions
DROP CONSTRAINT IF EXISTS questions_content_type_check1;

-- Update content_type constraint to include 'official_past_paper'
DO $$
BEGIN
    -- Check if constraint exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'questions_content_type_check'
        AND conrelid = 'public.questions'::regclass
    ) THEN
        -- Drop and recreate to update values
        ALTER TABLE public.questions DROP CONSTRAINT questions_content_type_check;
    END IF;
    
    -- Create the constraint
    ALTER TABLE public.questions 
    ADD CONSTRAINT questions_content_type_check 
    CHECK (content_type IN ('generated_text', 'image_ocr', 'official_past_paper'));
EXCEPTION WHEN duplicate_object THEN
    NULL; -- Constraint already exists with correct values
END $$;

-- Add constraint for valid exam_board values (only when set)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'questions_exam_board_check'
        AND conrelid = 'public.questions'::regclass
    ) THEN
        ALTER TABLE public.questions 
        ADD CONSTRAINT questions_exam_board_check 
        CHECK (exam_board IS NULL OR exam_board IN ('AQA', 'Edexcel', 'OCR', 'MEI', 'WJEC', 'CIE'));
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- =====================================================
-- Step 4: Create indexes for efficient querying
-- =====================================================

-- Index for filtering by exam board
CREATE INDEX IF NOT EXISTS idx_questions_exam_board 
ON public.questions(exam_board) 
WHERE exam_board IS NOT NULL;

-- Index for filtering by paper reference
CREATE INDEX IF NOT EXISTS idx_questions_paper_reference 
ON public.questions(paper_reference) 
WHERE paper_reference IS NOT NULL;

-- Index for filtering by level
CREATE INDEX IF NOT EXISTS idx_questions_level
ON public.questions(level)
WHERE level IS NOT NULL;

-- Composite index for common filter: content_type + exam_board
CREATE INDEX IF NOT EXISTS idx_questions_type_board 
ON public.questions(content_type, exam_board);

-- =====================================================
-- Step 5: Create question-snippets storage bucket
-- =====================================================

-- Create the bucket for question snippets (official paper images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'question-snippets', 
    'question-snippets', 
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760;

-- Storage policy: Allow authenticated users to upload
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload question snippets" ON storage.objects;
    CREATE POLICY "Authenticated users can upload question snippets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'question-snippets');
EXCEPTION WHEN undefined_object THEN
    CREATE POLICY "Authenticated users can upload question snippets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'question-snippets');
END $$;

-- Storage policy: Allow public read access
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view question snippets" ON storage.objects;
    CREATE POLICY "Anyone can view question snippets"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'question-snippets');
EXCEPTION WHEN undefined_object THEN
    CREATE POLICY "Anyone can view question snippets"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'question-snippets');
END $$;

-- Storage policy: Allow owners to delete their uploads
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete own question snippets" ON storage.objects;
    CREATE POLICY "Users can delete own question snippets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'question-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN undefined_object THEN
    CREATE POLICY "Users can delete own question snippets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'question-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;

-- =====================================================
-- Step 6: Add helpful comments
-- =====================================================

COMMENT ON COLUMN public.questions.content_type IS 'Source type: generated_text (AI), image_ocr (scanned), or official_past_paper (exam boards)';
COMMENT ON COLUMN public.questions.exam_board IS 'Exam board for official papers: AQA, Edexcel, OCR, MEI, WJEC, or CIE';
COMMENT ON COLUMN public.questions.level IS 'Curriculum level: GCSE Foundation, GCSE Higher, A-Level Pure, A-Level Stats, A-Level Mechanics';
COMMENT ON COLUMN public.questions.paper_reference IS 'Paper reference for official papers, e.g., "June 2023 Paper 1H"';
COMMENT ON COLUMN public.questions.question_number_ref IS 'Question number in the original paper, e.g., "Q4", "Q12a"';
COMMENT ON COLUMN public.questions.topic_name IS 'Display name for the topic';
COMMENT ON COLUMN public.questions.times_used IS 'Number of times this question has been used in exams';
COMMENT ON COLUMN public.questions.avg_score IS 'Average score percentage when this question is used';

-- =====================================================
-- Verification Query (run manually to check)
-- =====================================================
-- SELECT 
--     column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'questions' 
-- ORDER BY ordinal_position;
--
-- SELECT 
--     content_type, 
--     COUNT(*) as count,
--     COUNT(exam_board) as with_exam_board
-- FROM public.questions 
-- GROUP BY content_type;
