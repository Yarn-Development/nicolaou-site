-- =====================================================
-- QUESTIONS TABLE MIGRATION
-- =====================================================
-- This migration creates a robust questions table for
-- storing both AI-generated and OCR-extracted questions
-- =====================================================

-- ENUMS
-- =====================================================

-- Content type enum
CREATE TYPE content_type AS ENUM ('image_ocr', 'generated_text');

-- Difficulty tier enum (reuse if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_tier') THEN
        CREATE TYPE difficulty_tier AS ENUM ('Foundation', 'Higher');
    END IF;
END
$$;

-- =====================================================
-- QUESTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Content source tracking
  content_type content_type NOT NULL,
  
  -- Question content
  question_latex TEXT, -- LaTeX formatted question text
  image_url TEXT, -- Supabase Storage URL for original image (if OCR)
  
  -- Classification
  topic TEXT NOT NULL, -- e.g., 'Algebra', 'Geometry', 'Statistics'
  difficulty difficulty_tier NOT NULL,
  
  -- Additional metadata
  meta_tags TEXT[] DEFAULT '{}', -- Array of tags for filtering
  
  -- Answer information
  answer_key JSONB, -- Flexible JSON structure for various answer types
  -- Example structure:
  -- {
  --   "answer": "x = 5",
  --   "explanation": "Solve by isolating x...",
  --   "steps": ["Step 1...", "Step 2..."],
  --   "type": "algebraic" | "numeric" | "multiple_choice"
  -- }
  
  -- Ownership (optional - link to teacher who created it)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Quality control
  is_verified BOOLEAN DEFAULT false, -- Teacher reviewed and verified
  verification_notes TEXT,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0, -- How many times used in assessments
  avg_score DECIMAL(5,2), -- Average student performance on this question
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(question_latex, '') || ' ' || 
      COALESCE(topic, '') || ' ' ||
      COALESCE(array_to_string(meta_tags, ' '), '')
    )
  ) STORED
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Fast topic/difficulty filtering
CREATE INDEX idx_questions_topic ON public.questions(topic);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_questions_content_type ON public.questions(content_type);

-- Search optimization
CREATE INDEX idx_questions_search_vector ON public.questions USING GIN(search_vector);

-- Creator lookup
CREATE INDEX idx_questions_created_by ON public.questions(created_by);

-- Verified questions
CREATE INDEX idx_questions_verified ON public.questions(is_verified) WHERE is_verified = true;

-- Composite index for common queries
CREATE INDEX idx_questions_topic_difficulty ON public.questions(topic, difficulty);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view verified questions
CREATE POLICY "Anyone can view verified questions"
  ON public.questions
  FOR SELECT
  USING (is_verified = true);

-- Teachers can view all questions
CREATE POLICY "Teachers can view all questions"
  ON public.questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers can create questions
CREATE POLICY "Teachers can create questions"
  ON public.questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers can update their own questions
CREATE POLICY "Teachers can update own questions"
  ON public.questions
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Admins can update any question
CREATE POLICY "Admins can update any question"
  ON public.questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can delete their own questions
CREATE POLICY "Teachers can delete own questions"
  ON public.questions
  FOR DELETE
  USING (created_by = auth.uid());

-- Admins can delete any question
CREATE POLICY "Admins can delete any question"
  ON public.questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_questions_updated_at_trigger
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION update_questions_updated_at();

-- Function to increment times_used
CREATE OR REPLACE FUNCTION increment_question_usage(question_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.questions
  SET times_used = times_used + 1
  WHERE id = question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update average score
CREATE OR REPLACE FUNCTION update_question_avg_score(
  question_id UUID,
  new_score DECIMAL
)
RETURNS void AS $$
DECLARE
  current_avg DECIMAL;
  current_uses INTEGER;
BEGIN
  SELECT avg_score, times_used 
  INTO current_avg, current_uses
  FROM public.questions
  WHERE id = question_id;
  
  -- Calculate new average
  IF current_avg IS NULL THEN
    UPDATE public.questions
    SET avg_score = new_score
    WHERE id = question_id;
  ELSE
    UPDATE public.questions
    SET avg_score = ((current_avg * current_uses) + new_score) / (current_uses + 1)
    WHERE id = question_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE BUCKET FOR IMAGES
-- =====================================================

-- Note: This assumes Supabase Storage is configured
-- Create bucket via Supabase Dashboard or API:
-- Bucket name: 'question-images'
-- Public: false (requires authentication)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Uncomment to insert sample questions

/*
INSERT INTO public.questions (
  content_type,
  question_latex,
  topic,
  difficulty,
  meta_tags,
  answer_key,
  is_verified,
  created_by
) VALUES 
(
  'generated_text',
  'Solve the equation: $2x + 5 = 13$',
  'Algebra',
  'Foundation',
  ARRAY['linear equations', 'solving'],
  '{"answer": "x = 4", "explanation": "Subtract 5 from both sides to get 2x = 8, then divide by 2", "type": "algebraic"}'::jsonb,
  true,
  auth.uid() -- Replace with actual teacher UUID
),
(
  'generated_text',
  'Find the area of a circle with radius $r = 7$ cm. Use $\pi = 3.14$',
  'Geometry',
  'Foundation',
  ARRAY['area', 'circles', 'pi'],
  '{"answer": "153.86 cm²", "explanation": "Area = πr² = 3.14 × 7² = 3.14 × 49 = 153.86", "type": "numeric"}'::jsonb,
  true,
  auth.uid()
);
*/

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.questions IS 'Stores both AI-generated and OCR-extracted GCSE maths questions';
COMMENT ON COLUMN public.questions.content_type IS 'Source of the question: AI-generated or OCR from image';
COMMENT ON COLUMN public.questions.question_latex IS 'Question text in LaTeX format for proper mathematical notation';
COMMENT ON COLUMN public.questions.image_url IS 'Supabase Storage URL for original source image (if OCR)';
COMMENT ON COLUMN public.questions.answer_key IS 'Flexible JSON structure containing answer, explanation, and steps';
COMMENT ON COLUMN public.questions.search_vector IS 'Auto-generated full-text search vector';
COMMENT ON COLUMN public.questions.is_verified IS 'Whether question has been reviewed and approved by a teacher';
COMMENT ON COLUMN public.questions.times_used IS 'Number of times this question has been used in assessments';
COMMENT ON COLUMN public.questions.avg_score IS 'Average student performance score on this question';

-- =====================================================
-- VIEWS (Optional - for analytics)
-- =====================================================

-- View for popular questions
CREATE OR REPLACE VIEW public.popular_questions AS
SELECT 
  id,
  question_latex,
  topic,
  difficulty,
  times_used,
  avg_score,
  created_at
FROM public.questions
WHERE is_verified = true
ORDER BY times_used DESC
LIMIT 100;

-- View for questions by topic
CREATE OR REPLACE VIEW public.questions_by_topic AS
SELECT 
  topic,
  difficulty,
  COUNT(*) as total_questions,
  COUNT(*) FILTER (WHERE is_verified = true) as verified_questions,
  AVG(avg_score) as average_difficulty_score
FROM public.questions
GROUP BY topic, difficulty
ORDER BY topic, difficulty;

COMMENT ON VIEW public.popular_questions IS 'Top 100 most frequently used verified questions';
COMMENT ON VIEW public.questions_by_topic IS 'Question count and performance stats grouped by topic and difficulty';
