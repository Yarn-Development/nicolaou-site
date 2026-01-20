-- Migration: Add support for external paper uploads with topic mapping
-- Purpose: Allow teachers to upload PDFs created elsewhere and map topics for analytics

-- =====================================================
-- STEP 1: Create source_type enum for assignments
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_source_type') THEN
    CREATE TYPE assignment_source_type AS ENUM ('bank_builder', 'external_upload');
  END IF;
END$$;

-- =====================================================
-- STEP 2: Add new columns to assignments table
-- =====================================================

-- Add resource_url for storing uploaded PDF URL
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS resource_url TEXT;

-- Add source_type with default 'bank_builder' for backwards compatibility
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS source_type assignment_source_type DEFAULT 'bank_builder' NOT NULL;

COMMENT ON COLUMN assignments.resource_url IS 'URL to uploaded external exam paper (PDF)';
COMMENT ON COLUMN assignments.source_type IS 'Whether assignment uses question bank or external upload';

-- =====================================================
-- STEP 3: Modify assignment_questions for ghost data
-- =====================================================

-- Make question_id nullable (for ghost questions)
ALTER TABLE assignment_questions 
ALTER COLUMN question_id DROP NOT NULL;

-- Add ghost data columns for when question_id is null
ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS custom_question_number TEXT;

ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS custom_topic TEXT;

ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS custom_sub_topic TEXT;

ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS custom_marks INTEGER;

COMMENT ON COLUMN assignment_questions.custom_question_number IS 'Question number label (e.g., "1a", "2b") for external papers';
COMMENT ON COLUMN assignment_questions.custom_topic IS 'Topic for external paper questions (when question_id is null)';
COMMENT ON COLUMN assignment_questions.custom_sub_topic IS 'Sub-topic for external paper questions (when question_id is null)';
COMMENT ON COLUMN assignment_questions.custom_marks IS 'Marks for external paper questions (when question_id is null)';

-- Drop the existing unique constraint that requires question_id
ALTER TABLE assignment_questions 
DROP CONSTRAINT IF EXISTS assignment_questions_assignment_id_question_id_key;

-- Add a new unique constraint that works with nullable question_id
-- This uses a partial index approach - unique on (assignment_id, question_id) when question_id is not null
-- and unique on (assignment_id, order_index) when question_id is null
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_questions_bank_unique 
ON assignment_questions(assignment_id, question_id) 
WHERE question_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_questions_external_unique 
ON assignment_questions(assignment_id, order_index) 
WHERE question_id IS NULL;

-- Add check constraint to ensure ghost data is provided when question_id is null
ALTER TABLE assignment_questions
ADD CONSTRAINT chk_ghost_data_required 
CHECK (
  (question_id IS NOT NULL) OR 
  (question_id IS NULL AND custom_question_number IS NOT NULL AND custom_topic IS NOT NULL AND custom_marks IS NOT NULL)
);

-- =====================================================
-- STEP 4: Create storage bucket for exam papers
-- =====================================================

-- Note: Storage bucket creation must be done via Supabase dashboard or API
-- The bucket name will be 'exam-papers'
-- This is documented here for reference

-- =====================================================
-- STEP 5: Update get_assignment_questions function
-- =====================================================

CREATE OR REPLACE FUNCTION get_assignment_questions(p_assignment_id UUID)
RETURNS TABLE (
  question_id UUID,
  order_index INTEGER,
  marks INTEGER,
  question_latex TEXT,
  topic TEXT,
  sub_topic TEXT,
  difficulty TEXT,
  question_type TEXT,
  calculator_allowed BOOLEAN,
  answer_key JSONB,
  custom_question_number TEXT,
  is_ghost BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(q.id, aq.id) as question_id, -- Use aq.id as a pseudo-ID for ghost questions
    aq.order_index,
    COALESCE(aq.custom_marks, q.marks) as marks,
    COALESCE(q.question_latex, '') as question_latex,
    COALESCE(aq.custom_topic, q.topic) as topic,
    COALESCE(aq.custom_sub_topic, q.sub_topic) as sub_topic,
    COALESCE(q.difficulty, 'Foundation') as difficulty,
    COALESCE(q.question_type, 'Fluency') as question_type,
    COALESCE(q.calculator_allowed, false) as calculator_allowed,
    COALESCE(q.answer_key, '{}'::jsonb) as answer_key,
    aq.custom_question_number,
    (aq.question_id IS NULL) as is_ghost
  FROM assignment_questions aq
  LEFT JOIN questions q ON q.id = aq.question_id
  WHERE aq.assignment_id = p_assignment_id
  ORDER BY aq.order_index ASC;
END;
$$;

-- =====================================================
-- STEP 6: Update get_assignment_details function
-- =====================================================

CREATE OR REPLACE FUNCTION get_assignment_details(p_assignment_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  title TEXT,
  class_id UUID,
  class_name TEXT,
  subject TEXT,
  due_date TIMESTAMPTZ,
  status TEXT,
  total_marks INTEGER,
  question_count INTEGER,
  source_type TEXT,
  resource_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as assignment_id,
    a.title,
    a.class_id,
    c.name as class_name,
    c.subject,
    a.due_date,
    a.status::TEXT,
    COALESCE(SUM(COALESCE(aq.custom_marks, q.marks)), 0)::INTEGER as total_marks,
    COUNT(aq.id)::INTEGER as question_count,
    a.source_type::TEXT,
    a.resource_url
  FROM assignments a
  JOIN classes c ON c.id = a.class_id
  LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
  LEFT JOIN questions q ON q.id = aq.question_id
  WHERE a.id = p_assignment_id
  GROUP BY a.id, a.title, a.class_id, c.name, c.subject, a.due_date, a.status, a.source_type, a.resource_url;
END;
$$;

-- =====================================================
-- STEP 7: Add RLS policies for external assignments
-- =====================================================

-- No additional RLS needed - existing policies on assignments table cover external papers
-- The assignment_questions policies already allow teacher access via class ownership

-- =====================================================
-- STEP 8: Create helper function to get questions by topic for revision
-- =====================================================

CREATE OR REPLACE FUNCTION get_revision_questions_by_topic(
  p_topic TEXT,
  p_sub_topic TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT '{}',
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question_latex TEXT,
  image_url TEXT,
  content_type TEXT,
  marks INTEGER,
  topic TEXT,
  sub_topic TEXT,
  difficulty TEXT,
  answer_key JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.question_latex,
    q.image_url,
    q.content_type,
    q.marks,
    q.topic,
    q.sub_topic,
    q.difficulty,
    q.answer_key
  FROM questions q
  WHERE 
    -- Match topic (required)
    q.topic = p_topic
    -- Match sub_topic if provided
    AND (p_sub_topic IS NULL OR q.sub_topic = p_sub_topic)
    -- Match difficulty if provided
    AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
    -- Exclude already-used questions
    AND q.id != ALL(p_exclude_ids)
    -- Only verified questions for revision
    AND q.is_verified = true
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_assignment_questions IS 'Returns questions for an assignment, supporting both bank and ghost questions';
COMMENT ON FUNCTION get_assignment_details IS 'Returns assignment details including source type for external papers';
COMMENT ON FUNCTION get_revision_questions_by_topic IS 'Fetches random revision questions matching topic/sub-topic criteria';
