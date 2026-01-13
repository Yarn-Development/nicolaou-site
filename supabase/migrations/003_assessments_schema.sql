-- =====================================================
-- ASSESSMENT SYSTEM SCHEMA
-- =====================================================
-- This migration creates tables for:
-- 1. Exams/Assessments created by teachers
-- 2. Student assessment results
-- 3. Graded questions with detailed feedback
-- 4. Learning objectives tracking
-- =====================================================

-- ENUMS
-- =====================================================

-- Assessment status
CREATE TYPE assessment_status AS ENUM ('draft', 'published', 'archived');

-- Assessment tier
CREATE TYPE assessment_tier AS ENUM ('foundation', 'higher');

-- Question type
CREATE TYPE question_type AS ENUM ('multiple_choice', 'short_answer', 'long_answer', 'calculation');

-- Grading status
CREATE TYPE grading_status AS ENUM ('pending', 'in_progress', 'completed');

-- =====================================================
-- TABLES
-- =====================================================

-- 1. ASSESSMENTS TABLE
-- Stores exams/tests created by teachers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  
  -- Teacher who created it
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assessment metadata
  tier assessment_tier NOT NULL DEFAULT 'foundation',
  topic TEXT NOT NULL, -- e.g., "Algebra", "Geometry", etc.
  total_marks INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER, -- Suggested time to complete
  
  -- Status
  status assessment_status NOT NULL DEFAULT 'draft',
  
  -- Scheduling
  assigned_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ASSESSMENT QUESTIONS TABLE
-- Stores individual questions within an assessment
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to assessment
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  
  -- Question details
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'short_answer',
  max_marks INTEGER NOT NULL DEFAULT 1,
  
  -- Learning objective
  learning_objective TEXT NOT NULL,
  
  -- Optional: Multiple choice options
  options JSONB, -- Array of possible answers for multiple choice
  correct_answer TEXT, -- For auto-grading (if applicable)
  
  -- Question metadata
  difficulty_level TEXT, -- "easy", "medium", "hard"
  calculator_allowed BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure question numbers are unique within an assessment
  UNIQUE(assessment_id, question_number)
);

-- 3. STUDENT ASSESSMENTS TABLE
-- Links students to assessments they need to complete
-- =====================================================
CREATE TABLE IF NOT EXISTS public.student_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_by UUID NOT NULL REFERENCES auth.users(id), -- Teacher who assigned
  assigned_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  
  -- Completion tracking
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  
  -- Overall grading
  grading_status grading_status NOT NULL DEFAULT 'pending',
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  
  -- Results
  total_marks_awarded INTEGER,
  percentage_score DECIMAL(5,2), -- e.g., 87.50
  grade TEXT, -- e.g., "A", "B+", "7", "8"
  
  -- Feedback
  overall_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- A student can only have one instance of an assessment
  UNIQUE(assessment_id, student_id)
);

-- 4. GRADED QUESTIONS TABLE
-- Stores individual question results for each student
-- This is what powers the feedback sheet!
-- =====================================================
CREATE TABLE IF NOT EXISTS public.graded_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  student_assessment_id UUID NOT NULL REFERENCES public.student_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  
  -- Student's answer
  student_answer TEXT,
  student_work JSONB, -- For complex answers, diagrams, steps
  
  -- Grading
  marks_awarded INTEGER NOT NULL DEFAULT 0,
  max_marks INTEGER NOT NULL, -- Denormalized from question for faster queries
  
  -- Feedback
  feedback TEXT, -- Teacher's specific feedback for this question
  
  -- Question metadata (denormalized for feedback sheet performance)
  question_number INTEGER NOT NULL,
  learning_objective TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- A student can only have one answer per question
  UNIQUE(student_assessment_id, question_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Assessments
CREATE INDEX idx_assessments_teacher ON public.assessments(teacher_id);
CREATE INDEX idx_assessments_status ON public.assessments(status);
CREATE INDEX idx_assessments_topic ON public.assessments(topic);
CREATE INDEX idx_assessments_due_date ON public.assessments(due_date);

-- Assessment Questions
CREATE INDEX idx_assessment_questions_assessment ON public.assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_objective ON public.assessment_questions(learning_objective);

-- Student Assessments
CREATE INDEX idx_student_assessments_student ON public.student_assessments(student_id);
CREATE INDEX idx_student_assessments_assessment ON public.student_assessments(assessment_id);
CREATE INDEX idx_student_assessments_assigned_by ON public.student_assessments(assigned_by);
CREATE INDEX idx_student_assessments_status ON public.student_assessments(grading_status);
CREATE INDEX idx_student_assessments_due_date ON public.student_assessments(due_date);

-- Graded Questions
CREATE INDEX idx_graded_questions_student_assessment ON public.graded_questions(student_assessment_id);
CREATE INDEX idx_graded_questions_question ON public.graded_questions(question_id);
CREATE INDEX idx_graded_questions_objective ON public.graded_questions(learning_objective);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_questions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: ASSESSMENTS
-- =====================================================

-- Teachers can view their own assessments
CREATE POLICY "Teachers can view own assessments"
  ON public.assessments
  FOR SELECT
  USING (
    teacher_id = auth.uid()
  );

-- Teachers can create assessments
CREATE POLICY "Teachers can create assessments"
  ON public.assessments
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers can update their own assessments
CREATE POLICY "Teachers can update own assessments"
  ON public.assessments
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own draft assessments
CREATE POLICY "Teachers can delete own draft assessments"
  ON public.assessments
  FOR DELETE
  USING (
    teacher_id = auth.uid() AND
    status = 'draft'
  );

-- =====================================================
-- RLS POLICIES: ASSESSMENT QUESTIONS
-- =====================================================

-- Teachers can view questions for their assessments
CREATE POLICY "Teachers can view own assessment questions"
  ON public.assessment_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can create questions for their assessments
CREATE POLICY "Teachers can create questions"
  ON public.assessment_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can update questions for their assessments
CREATE POLICY "Teachers can update own questions"
  ON public.assessment_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can delete questions for their assessments
CREATE POLICY "Teachers can delete own questions"
  ON public.assessment_questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: STUDENT ASSESSMENTS
-- =====================================================

-- Students can view their own assignments
CREATE POLICY "Students can view own assignments"
  ON public.student_assessments
  FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can view assignments they created
CREATE POLICY "Teachers can view assigned assessments"
  ON public.student_assessments
  FOR SELECT
  USING (assigned_by = auth.uid());

-- Teachers can assign assessments
CREATE POLICY "Teachers can assign assessments"
  ON public.student_assessments
  FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers can update assignments they created
CREATE POLICY "Teachers can update assignments"
  ON public.student_assessments
  FOR UPDATE
  USING (assigned_by = auth.uid());

-- Students can update their own submission status
CREATE POLICY "Students can submit assignments"
  ON public.student_assessments
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- =====================================================
-- RLS POLICIES: GRADED QUESTIONS
-- =====================================================

-- Students can view their own graded questions
CREATE POLICY "Students can view own graded questions"
  ON public.graded_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments
      WHERE id = student_assessment_id AND student_id = auth.uid()
    )
  );

-- Teachers can view graded questions for assessments they assigned
CREATE POLICY "Teachers can view graded questions"
  ON public.graded_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments
      WHERE id = student_assessment_id AND assigned_by = auth.uid()
    )
  );

-- Teachers can create graded questions
CREATE POLICY "Teachers can create graded questions"
  ON public.graded_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_assessments
      WHERE id = student_assessment_id AND assigned_by = auth.uid()
    )
  );

-- Teachers can update graded questions
CREATE POLICY "Teachers can update graded questions"
  ON public.graded_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments
      WHERE id = student_assessment_id AND assigned_by = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to auto-update total_marks when questions change
CREATE OR REPLACE FUNCTION update_assessment_total_marks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assessments
  SET total_marks = (
    SELECT COALESCE(SUM(max_marks), 0)
    FROM public.assessment_questions
    WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-calculate percentage score
CREATE OR REPLACE FUNCTION calculate_percentage_score()
RETURNS TRIGGER AS $$
DECLARE
  v_total_marks INTEGER;
BEGIN
  -- Get total possible marks
  SELECT total_marks INTO v_total_marks
  FROM public.assessments a
  JOIN public.student_assessments sa ON sa.assessment_id = a.id
  WHERE sa.id = NEW.id;
  
  -- Calculate percentage
  IF v_total_marks > 0 AND NEW.total_marks_awarded IS NOT NULL THEN
    NEW.percentage_score := ROUND((NEW.total_marks_awarded::DECIMAL / v_total_marks::DECIMAL) * 100, 2);
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update assessment total marks when questions change
CREATE TRIGGER update_assessment_marks_on_question_insert
  AFTER INSERT ON public.assessment_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_total_marks();

CREATE TRIGGER update_assessment_marks_on_question_update
  AFTER UPDATE ON public.assessment_questions
  FOR EACH ROW
  WHEN (OLD.max_marks IS DISTINCT FROM NEW.max_marks)
  EXECUTE FUNCTION update_assessment_total_marks();

CREATE TRIGGER update_assessment_marks_on_question_delete
  AFTER DELETE ON public.assessment_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_total_marks();

-- Auto-calculate percentage on student assessment update
CREATE TRIGGER calculate_percentage_on_update
  BEFORE UPDATE ON public.student_assessments
  FOR EACH ROW
  WHEN (OLD.total_marks_awarded IS DISTINCT FROM NEW.total_marks_awarded)
  EXECUTE FUNCTION calculate_percentage_score();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_assessments_updated_at
  BEFORE UPDATE ON public.student_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graded_questions_updated_at
  BEFORE UPDATE ON public.graded_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (for development/testing)
-- =====================================================

-- Uncomment to insert sample data after setting up user accounts

/*
-- Sample Assessment (replace teacher_id with actual teacher UUID)
INSERT INTO public.assessments (id, title, description, teacher_id, tier, topic, duration_minutes, status)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'GCSE Module 5: Quadratic Equations',
  'Assessment covering solving quadratic equations, factoring, and the quadratic formula',
  'YOUR_TEACHER_UUID_HERE',
  'higher',
  'Algebra',
  45,
  'published'
);

-- Sample Questions
INSERT INTO public.assessment_questions (assessment_id, question_number, question_text, question_type, max_marks, learning_objective, difficulty_level)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 1, 'Solve x² + 5x + 6 = 0 by factoring', 'short_answer', 3, 'Solve quadratic equations by factoring', 'easy'),
  ('a1111111-1111-1111-1111-111111111111', 2, 'Use the quadratic formula to solve 2x² - 7x + 3 = 0', 'calculation', 5, 'Apply the quadratic formula', 'medium'),
  ('a1111111-1111-1111-1111-111111111111', 3, 'Explain when a quadratic equation has no real solutions', 'long_answer', 4, 'Understand the discriminant', 'hard');
*/

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.assessments IS 'Stores assessments/exams created by teachers';
COMMENT ON TABLE public.assessment_questions IS 'Individual questions within an assessment';
COMMENT ON TABLE public.student_assessments IS 'Links students to assessments they must complete';
COMMENT ON TABLE public.graded_questions IS 'Stores graded results for each question - powers feedback sheets';

COMMENT ON COLUMN public.graded_questions.learning_objective IS 'Denormalized for performance in feedback sheet queries';
COMMENT ON COLUMN public.graded_questions.question_number IS 'Denormalized for performance in feedback sheet queries';
COMMENT ON COLUMN public.student_assessments.percentage_score IS 'Auto-calculated from total_marks_awarded';
