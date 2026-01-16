-- Migration: Add 'in_progress' status to submission_status enum
-- Purpose: Allow students to save progress before final submission

-- Add new value to the enum type
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'submitted';

-- Update default to 'in_progress' for new submissions (students can save as they go)
-- Note: This changes the workflow so submissions start as in_progress rather than submitted
COMMENT ON TYPE submission_status IS 'Submission workflow: in_progress -> submitted -> graded';
