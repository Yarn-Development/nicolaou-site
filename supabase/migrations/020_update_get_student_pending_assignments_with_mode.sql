-- Migration: Update get_student_pending_assignments to include mode column
-- Purpose: Return assignment mode (online/paper) for student dashboard display

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_student_pending_assignments(UUID);

CREATE OR REPLACE FUNCTION get_student_pending_assignments(p_student_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  title TEXT,
  due_date TIMESTAMPTZ,
  class_id UUID,
  class_name TEXT,
  subject TEXT,
  mode TEXT,
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
    a.mode,
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
