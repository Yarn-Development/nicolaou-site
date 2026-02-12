-- Migration: Fix get_assignment_questions difficulty_tier → TEXT cast
-- The 022 migration re-created this function and dropped the ::TEXT cast
-- that migration 018 had previously applied. This restores it.

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
    COALESCE(q.id, aq.id) as question_id,
    aq.order_index,
    COALESCE(aq.custom_marks, q.marks) as marks,
    COALESCE(q.question_latex, '') as question_latex,
    COALESCE(aq.custom_topic, q.topic) as topic,
    COALESCE(aq.custom_sub_topic, q.sub_topic) as sub_topic,
    COALESCE(q.difficulty::TEXT, 'Foundation') as difficulty,
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
