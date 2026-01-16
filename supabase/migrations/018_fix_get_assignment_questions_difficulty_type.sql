-- Migration: Fix get_assignment_questions function to cast difficulty enum to text
-- Purpose: Resolve type mismatch between difficulty_tier enum and expected TEXT

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
    q.difficulty::TEXT,  -- Cast enum to TEXT
    q.question_type,
    q.calculator_allowed,
    q.answer_key
  FROM assignment_questions aq
  JOIN questions q ON q.id = aq.question_id
  WHERE aq.assignment_id = p_assignment_id
  ORDER BY aq.order_index ASC;
END;
$$;
