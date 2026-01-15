-- =====================================================
-- Questions Table Migration
-- =====================================================
-- Creates the questions table for the Question Ingestion pipeline
-- Supports both AI-generated text and OCR image questions
-- =====================================================

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  -- Primary identifiers
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Content type and data
  content_type text NOT NULL CHECK (content_type IN ('generated_text', 'image_ocr')),
  question_latex text NOT NULL,
  image_url text,
  
  -- Curriculum metadata
  curriculum_level text NOT NULL,
  topic text NOT NULL,
  sub_topic text NOT NULL,
  
  -- Pedagogical tags
  difficulty text NOT NULL CHECK (difficulty IN ('Foundation', 'Higher')),
  marks integer NOT NULL CHECK (marks > 0),
  question_type text NOT NULL CHECK (question_type IN ('Fluency', 'Problem Solving', 'Reasoning/Proof')),
  calculator_allowed boolean NOT NULL DEFAULT false,
  
  -- Answer and verification
  answer_key jsonb NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_questions_created_by ON public.questions(created_by);
CREATE INDEX idx_questions_content_type ON public.questions(content_type);
CREATE INDEX idx_questions_curriculum_level ON public.questions(curriculum_level);
CREATE INDEX idx_questions_topic ON public.questions(topic);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_questions_is_verified ON public.questions(is_verified);
CREATE INDEX idx_questions_created_at ON public.questions(created_at DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can insert questions
CREATE POLICY "Teachers can insert questions"
  ON public.questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policy: Teachers can read all questions (shared resource bank)
CREATE POLICY "Teachers can read all questions"
  ON public.questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policy: Teachers can update their own questions
CREATE POLICY "Teachers can update own questions"
  ON public.questions
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Teachers can delete their own questions
CREATE POLICY "Teachers can delete own questions"
  ON public.questions
  FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Students can read all verified questions (for now - will refine later for assignments)
CREATE POLICY "Students can read verified questions"
  ON public.questions
  FOR SELECT
  USING (
    is_verified = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- =====================================================
-- VALIDATION FUNCTION
-- =====================================================

-- Function to validate answer_key JSONB structure
CREATE OR REPLACE FUNCTION public.validate_answer_key(answer_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check that answer_key has required fields
  RETURN (
    answer_data ? 'answer' AND
    answer_data ? 'explanation'
  );
END;
$$;

-- Add a check constraint to ensure answer_key has correct structure
ALTER TABLE public.questions
ADD CONSTRAINT answer_key_structure_check
CHECK (validate_answer_key(answer_key));

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.questions IS 'Stores all questions from AI generation and OCR ingestion';
COMMENT ON COLUMN public.questions.content_type IS 'Type of question source: generated_text or image_ocr';
COMMENT ON COLUMN public.questions.question_latex IS 'LaTeX formatted question text or OCR extracted text';
COMMENT ON COLUMN public.questions.image_url IS 'URL to stored image for OCR questions';
COMMENT ON COLUMN public.questions.answer_key IS 'JSONB containing answer, explanation, and optional mark scheme';
COMMENT ON COLUMN public.questions.is_verified IS 'Whether question has been reviewed and verified by a teacher';
