-- Migration: Add grading_data column to submissions table
-- Purpose: Store per-question scores for detailed marking

-- Add grading_data JSONB column to store question-by-question scores
-- Format: { "question_id_1": { "score": 2 }, "question_id_2": { "score": 5 } }
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS grading_data JSONB DEFAULT '{}' NOT NULL;

-- Add feedback_released column to track if feedback is visible to students
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS feedback_released BOOLEAN DEFAULT false NOT NULL;

-- Add index for faster queries on grading_data
CREATE INDEX IF NOT EXISTS idx_submissions_grading_data ON submissions USING GIN (grading_data);

-- Update comment to document the column
COMMENT ON COLUMN submissions.grading_data IS 'Stores per-question scores: { "question_id": { "score": number } }';
COMMENT ON COLUMN submissions.feedback_released IS 'Whether feedback/grades are visible to the student';
