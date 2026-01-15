-- Migration: Create assignment_questions junction table
-- Purpose: Link questions to assignments with ordering and optional custom marks

-- =====================================================
-- ASSIGNMENT_QUESTIONS JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS assignment_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  custom_marks INTEGER, -- Optional: override default question marks for this assignment
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure each question appears only once per assignment
  UNIQUE(assignment_id, question_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_assignment_questions_assignment_id ON assignment_questions(assignment_id);
CREATE INDEX idx_assignment_questions_question_id ON assignment_questions(question_id);
CREATE INDEX idx_assignment_questions_order ON assignment_questions(assignment_id, order_index);

-- Add comments
COMMENT ON TABLE assignment_questions IS 'Junction table linking questions to assignments with ordering';
COMMENT ON COLUMN assignment_questions.order_index IS 'Position of question in assignment (0-based for Q1, Q2, etc.)';
COMMENT ON COLUMN assignment_questions.custom_marks IS 'Optional override for question marks in this specific assignment';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can view assignment_questions for their class assignments
CREATE POLICY "Teachers can view their assignment questions"
  ON assignment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = assignment_questions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can view assignment_questions for published assignments in enrolled classes
CREATE POLICY "Students can view questions for enrolled published assignments"
  ON assignment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN enrollments e ON e.class_id = a.class_id
      WHERE a.id = assignment_questions.assignment_id
      AND a.status = 'published'
      AND e.student_id = auth.uid()
    )
  );

-- Teachers can insert assignment_questions for their class assignments
CREATE POLICY "Teachers can add questions to their assignments"
  ON assignment_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update assignment_questions for their class assignments
CREATE POLICY "Teachers can update their assignment questions"
  ON assignment_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = assignment_questions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can delete assignment_questions for their class assignments
CREATE POLICY "Teachers can remove questions from their assignments"
  ON assignment_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = assignment_questions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTION: Get ordered questions for an assignment
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
  answer_key JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as question_id,
    aq.order_index,
    COALESCE(aq.custom_marks, q.marks) as marks,
    q.question_latex,
    q.topic,
    q.sub_topic,
    q.difficulty,
    q.question_type,
    q.calculator_allowed,
    q.answer_key
  FROM assignment_questions aq
  JOIN questions q ON q.id = aq.question_id
  WHERE aq.assignment_id = p_assignment_id
  ORDER BY aq.order_index ASC;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Get assignment details with questions
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
  question_count INTEGER
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
    COUNT(aq.id)::INTEGER as question_count
  FROM assignments a
  JOIN classes c ON c.id = a.class_id
  LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
  LEFT JOIN questions q ON q.id = aq.question_id
  WHERE a.id = p_assignment_id
  GROUP BY a.id, a.title, a.class_id, c.name, c.subject, a.due_date, a.status;
END;
$$;
