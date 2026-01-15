-- Migration: Create assignments and submissions tables
-- Purpose: Enable teachers to create assignments and students to submit work

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Assignment status enum
CREATE TYPE assignment_status AS ENUM ('draft', 'published');

-- Submission status enum
CREATE TYPE submission_status AS ENUM ('submitted', 'graded');

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status assignment_status DEFAULT 'draft' NOT NULL,
  content JSONB DEFAULT '{}' NOT NULL, -- Stores question IDs, worksheet data, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for faster class lookups
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- =====================================================
-- SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER,
  status submission_status DEFAULT 'submitted' NOT NULL,
  answers JSONB DEFAULT '{}' NOT NULL, -- Stores student answers
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  graded_at TIMESTAMPTZ,
  
  -- Ensure one submission per student per assignment
  UNIQUE(assignment_id, student_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Trigger to auto-update updated_at for assignments
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ASSIGNMENTS POLICIES
-- =====================================================

-- Teachers can view assignments for their own classes
CREATE POLICY "Teachers can view their class assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can view published assignments for classes they're enrolled in
CREATE POLICY "Students can view published assignments for enrolled classes"
  ON assignments FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.class_id = assignments.class_id
      AND enrollments.student_id = auth.uid()
    )
  );

-- Teachers can create assignments for their own classes
CREATE POLICY "Teachers can create assignments for their classes"
  ON assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update their own class assignments
CREATE POLICY "Teachers can update their class assignments"
  ON assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete their own class assignments
CREATE POLICY "Teachers can delete their class assignments"
  ON assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- SUBMISSIONS POLICIES
-- =====================================================

-- Teachers can view submissions for assignments in their classes
CREATE POLICY "Teachers can view submissions for their class assignments"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN classes ON classes.id = assignments.class_id
      WHERE assignments.id = submissions.assignment_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
  ON submissions FOR SELECT
  USING (student_id = auth.uid());

-- Students can create submissions for published assignments they're enrolled in
CREATE POLICY "Students can submit to published assignments"
  ON submissions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM assignments
      JOIN enrollments ON enrollments.class_id = assignments.class_id
      WHERE assignments.id = assignment_id
      AND assignments.status = 'published'
      AND enrollments.student_id = auth.uid()
    )
  );

-- Students can update their own ungraded submissions
CREATE POLICY "Students can update their ungraded submissions"
  ON submissions FOR UPDATE
  USING (
    student_id = auth.uid()
    AND status = 'submitted'
  );

-- Teachers can update submissions (for grading)
CREATE POLICY "Teachers can grade submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN classes ON classes.id = assignments.class_id
      WHERE assignments.id = submissions.assignment_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTION: Get assignment with class info
-- =====================================================

CREATE OR REPLACE FUNCTION get_student_pending_assignments(p_student_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  title TEXT,
  due_date TIMESTAMPTZ,
  class_id UUID,
  class_name TEXT,
  subject TEXT,
  has_submitted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as assignment_id,
    a.title,
    a.due_date,
    c.id as class_id,
    c.name as class_name,
    c.subject,
    EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.assignment_id = a.id 
      AND s.student_id = p_student_id
    ) as has_submitted
  FROM assignments a
  JOIN classes c ON c.id = a.class_id
  JOIN enrollments e ON e.class_id = c.id
  WHERE e.student_id = p_student_id
  AND a.status = 'published'
  ORDER BY a.due_date ASC NULLS LAST;
END;
$$;
