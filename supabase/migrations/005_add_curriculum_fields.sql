-- =============================================
-- Migration: Add Curriculum-Aware Fields to Questions Table
-- Description: Extends questions table to support UK curriculum taxonomy
-- Author: Refactorer Agent
-- Date: 2026-01-13
-- =============================================

-- Step 1: Add new curriculum columns to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS curriculum_level TEXT,
  ADD COLUMN IF NOT EXISTS topic_name TEXT,
  ADD COLUMN IF NOT EXISTS sub_topic_name TEXT,
  ADD COLUMN IF NOT EXISTS question_type TEXT,
  ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS calculator_allowed BOOLEAN DEFAULT true;

-- Step 2: Add check constraints for data integrity
ALTER TABLE questions
  ADD CONSTRAINT check_curriculum_level 
    CHECK (curriculum_level IN (
      'KS3',
      'GCSE Foundation',
      'GCSE Higher',
      'A-Level Pure',
      'A-Level Statistics',
      'A-Level Mechanics'
    ) OR curriculum_level IS NULL);

ALTER TABLE questions
  ADD CONSTRAINT check_question_type
    CHECK (question_type IN (
      'Fluency',
      'Problem Solving',
      'Reasoning/Proof'
    ) OR question_type IS NULL);

ALTER TABLE questions
  ADD CONSTRAINT check_marks_range
    CHECK (marks >= 1 AND marks <= 10 OR marks IS NULL);

-- Step 3: Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_questions_curriculum_level 
  ON questions(curriculum_level);

CREATE INDEX IF NOT EXISTS idx_questions_topic 
  ON questions(topic_name);

CREATE INDEX IF NOT EXISTS idx_questions_sub_topic 
  ON questions(sub_topic_name);

CREATE INDEX IF NOT EXISTS idx_questions_type 
  ON questions(question_type);

CREATE INDEX IF NOT EXISTS idx_questions_marks 
  ON questions(marks);

CREATE INDEX IF NOT EXISTS idx_questions_calculator 
  ON questions(calculator_allowed);

-- Step 4: Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_questions_curriculum_composite
  ON questions(curriculum_level, topic_name, sub_topic_name, question_type);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN questions.curriculum_level IS 'UK curriculum level (KS3, GCSE Foundation/Higher, A-Level Pure/Stats/Mechanics)';
COMMENT ON COLUMN questions.topic_name IS 'Main topic name (e.g., Algebra, Geometry)';
COMMENT ON COLUMN questions.sub_topic_name IS 'Specific sub-topic (e.g., Completing the Square)';
COMMENT ON COLUMN questions.question_type IS 'Pedagogical question type (Fluency, Problem Solving, Reasoning/Proof)';
COMMENT ON COLUMN questions.marks IS 'Mark allocation (typically 1-6 for GCSE, can be higher for A-Level)';
COMMENT ON COLUMN questions.calculator_allowed IS 'Whether calculator is permitted for this question';

-- Step 6: Update existing questions with default values (optional)
-- This ensures backward compatibility for existing questions
UPDATE questions
SET 
  curriculum_level = CASE 
    WHEN difficulty_tier = 'Foundation' THEN 'GCSE Foundation'
    WHEN difficulty_tier = 'Higher' THEN 'GCSE Higher'
    ELSE NULL
  END,
  topic_name = topic,
  question_type = 'Fluency', -- Default to fluency for existing questions
  marks = 3, -- Default mark value
  calculator_allowed = true -- Default to calculator allowed
WHERE curriculum_level IS NULL;

-- =============================================
-- Rollback Instructions (if needed):
-- =============================================
-- DROP INDEX IF EXISTS idx_questions_curriculum_composite;
-- DROP INDEX IF EXISTS idx_questions_calculator;
-- DROP INDEX IF EXISTS idx_questions_marks;
-- DROP INDEX IF EXISTS idx_questions_type;
-- DROP INDEX IF EXISTS idx_questions_sub_topic;
-- DROP INDEX IF EXISTS idx_questions_topic;
-- DROP INDEX IF EXISTS idx_questions_curriculum_level;
-- 
-- ALTER TABLE questions DROP CONSTRAINT IF EXISTS check_marks_range;
-- ALTER TABLE questions DROP CONSTRAINT IF EXISTS check_question_type;
-- ALTER TABLE questions DROP CONSTRAINT IF EXISTS check_curriculum_level;
-- 
-- ALTER TABLE questions 
--   DROP COLUMN IF EXISTS calculator_allowed,
--   DROP COLUMN IF EXISTS marks,
--   DROP COLUMN IF EXISTS question_type,
--   DROP COLUMN IF EXISTS sub_topic_name,
--   DROP COLUMN IF EXISTS topic_name,
--   DROP COLUMN IF EXISTS curriculum_level;
