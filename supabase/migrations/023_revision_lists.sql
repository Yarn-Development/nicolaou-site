-- =====================================================
-- Migration: 023_revision_lists.sql
-- Description: Create tables for revision lists feature
-- 
-- This enables the "Upload Paper -> Generate Similar Questions -> 
-- Create Revision Lists -> Allocate to Students" workflow
-- =====================================================

-- =====================================================
-- 1. Create revision_lists table
-- Links an assignment to its generated revision questions
-- =====================================================

CREATE TABLE IF NOT EXISTS revision_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one revision list per assignment
  UNIQUE(assignment_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_revision_lists_assignment 
  ON revision_lists(assignment_id);
CREATE INDEX IF NOT EXISTS idx_revision_lists_created_by 
  ON revision_lists(created_by);

-- =====================================================
-- 2. Create revision_list_questions table
-- Many-to-many linking revision lists to questions
-- =====================================================

CREATE TABLE IF NOT EXISTS revision_list_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_list_id UUID NOT NULL REFERENCES revision_lists(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  
  -- Track which original question this was generated from
  source_question_number TEXT,  -- e.g., "Q3a" from the original paper
  source_question_latex TEXT,   -- The original question text (for reference)
  
  -- Ordering within the revision list
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate question entries in the same list
  UNIQUE(revision_list_id, question_id)
);

-- Indexes for faster joins
CREATE INDEX IF NOT EXISTS idx_revision_list_questions_list 
  ON revision_list_questions(revision_list_id);
CREATE INDEX IF NOT EXISTS idx_revision_list_questions_question 
  ON revision_list_questions(question_id);

-- =====================================================
-- 3. Create student_revision_allocations table
-- Tracks which students are assigned which revision lists
-- =====================================================

CREATE TYPE revision_allocation_status AS ENUM ('pending', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS student_revision_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_list_id UUID NOT NULL REFERENCES revision_lists(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status tracking
  status revision_allocation_status DEFAULT 'pending',
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Progress tracking (JSONB to store per-question completion)
  -- Format: { "question_id": { "completed": true, "completed_at": "..." } }
  progress JSONB DEFAULT '{}'::jsonb,
  
  -- Prevent duplicate allocations
  UNIQUE(revision_list_id, student_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_revision_allocations_list 
  ON student_revision_allocations(revision_list_id);
CREATE INDEX IF NOT EXISTS idx_student_revision_allocations_student 
  ON student_revision_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_student_revision_allocations_status 
  ON student_revision_allocations(status);

-- =====================================================
-- 4. RLS Policies for revision_lists
-- =====================================================

ALTER TABLE revision_lists ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own revision lists
CREATE POLICY revision_lists_teacher_select ON revision_lists
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Teachers can view revision lists for assignments in their classes
CREATE POLICY revision_lists_teacher_via_class ON revision_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = revision_lists.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can insert revision lists for their assignments
CREATE POLICY revision_lists_teacher_insert ON revision_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update their revision lists
CREATE POLICY revision_lists_teacher_update ON revision_lists
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Teachers can delete their revision lists
CREATE POLICY revision_lists_teacher_delete ON revision_lists
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Students can view revision lists allocated to them
CREATE POLICY revision_lists_student_select ON revision_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_revision_allocations sra
      WHERE sra.revision_list_id = revision_lists.id
      AND sra.student_id = auth.uid()
    )
  );

-- =====================================================
-- 5. RLS Policies for revision_list_questions
-- =====================================================

ALTER TABLE revision_list_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage questions in their revision lists
CREATE POLICY rlq_teacher_all ON revision_list_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM revision_lists rl
      WHERE rl.id = revision_list_questions.revision_list_id
      AND rl.created_by = auth.uid()
    )
  );

-- Students can view questions in revision lists allocated to them
CREATE POLICY rlq_student_select ON revision_list_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_revision_allocations sra
      WHERE sra.revision_list_id = revision_list_questions.revision_list_id
      AND sra.student_id = auth.uid()
    )
  );

-- =====================================================
-- 6. RLS Policies for student_revision_allocations
-- =====================================================

ALTER TABLE student_revision_allocations ENABLE ROW LEVEL SECURITY;

-- Teachers can manage allocations for their revision lists
CREATE POLICY sra_teacher_all ON student_revision_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM revision_lists rl
      WHERE rl.id = student_revision_allocations.revision_list_id
      AND rl.created_by = auth.uid()
    )
  );

-- Students can view their own allocations
CREATE POLICY sra_student_select ON student_revision_allocations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can update their own allocation progress
CREATE POLICY sra_student_update ON student_revision_allocations
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- =====================================================
-- 7. Helper Functions
-- =====================================================

-- Function to get a student's revision lists with progress
CREATE OR REPLACE FUNCTION get_student_revision_lists(p_student_id UUID)
RETURNS TABLE (
  revision_list_id UUID,
  title TEXT,
  description TEXT,
  assignment_id UUID,
  assignment_title TEXT,
  class_name TEXT,
  status revision_allocation_status,
  allocated_at TIMESTAMPTZ,
  total_questions INTEGER,
  completed_questions INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.id AS revision_list_id,
    rl.title,
    rl.description,
    rl.assignment_id,
    a.title AS assignment_title,
    c.name AS class_name,
    sra.status,
    sra.allocated_at,
    (SELECT COUNT(*)::INTEGER FROM revision_list_questions WHERE revision_list_id = rl.id) AS total_questions,
    (
      SELECT COUNT(*)::INTEGER 
      FROM jsonb_object_keys(COALESCE(sra.progress, '{}'::jsonb)) AS k
      WHERE (sra.progress->k->>'completed')::boolean = true
    ) AS completed_questions,
    rl.created_at
  FROM student_revision_allocations sra
  JOIN revision_lists rl ON sra.revision_list_id = rl.id
  LEFT JOIN assignments a ON rl.assignment_id = a.id
  LEFT JOIN classes c ON a.class_id = c.id
  WHERE sra.student_id = p_student_id
  ORDER BY sra.allocated_at DESC;
END;
$$;

-- Function to get revision list questions with full details
CREATE OR REPLACE FUNCTION get_revision_list_questions(p_revision_list_id UUID)
RETURNS TABLE (
  question_id UUID,
  order_index INTEGER,
  source_question_number TEXT,
  source_question_latex TEXT,
  question_latex TEXT,
  image_url TEXT,
  topic TEXT,
  sub_topic TEXT,
  difficulty TEXT,
  marks INTEGER,
  answer_key JSONB,
  calculator_allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id AS question_id,
    rlq.order_index,
    rlq.source_question_number,
    rlq.source_question_latex,
    q.question_latex,
    q.image_url,
    q.topic,
    q.sub_topic_name AS sub_topic,
    q.difficulty::TEXT,
    q.marks,
    q.answer_key::JSONB,
    q.calculator_allowed
  FROM revision_list_questions rlq
  JOIN questions q ON rlq.question_id = q.id
  WHERE rlq.revision_list_id = p_revision_list_id
  ORDER BY rlq.order_index;
END;
$$;

-- Function to allocate revision list to all students in a class
CREATE OR REPLACE FUNCTION allocate_revision_list_to_class(
  p_revision_list_id UUID,
  p_class_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert allocations for all enrolled students
  INSERT INTO student_revision_allocations (revision_list_id, student_id)
  SELECT p_revision_list_id, e.student_id
  FROM enrollments e
  WHERE e.class_id = p_class_id
  ON CONFLICT (revision_list_id, student_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 8. Add content_type for revision-generated questions
-- =====================================================

-- Add 'revision_generated' to content_type if not exists
DO $$
BEGIN
  -- Check if the enum value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'revision_generated' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_type')
  ) THEN
    ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'revision_generated';
  END IF;
END
$$;

-- =====================================================
-- 9. Updated_at trigger for revision_lists
-- =====================================================

CREATE OR REPLACE FUNCTION update_revision_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revision_lists_updated_at
  BEFORE UPDATE ON revision_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_revision_lists_updated_at();

-- =====================================================
-- Done!
-- =====================================================

COMMENT ON TABLE revision_lists IS 'Stores revision lists generated from uploaded papers';
COMMENT ON TABLE revision_list_questions IS 'Links revision lists to their generated questions';
COMMENT ON TABLE student_revision_allocations IS 'Tracks which students are assigned which revision lists';
