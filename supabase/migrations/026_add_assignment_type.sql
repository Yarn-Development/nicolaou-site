-- =====================================================
-- Migration: 026_add_assignment_type.sql
-- Description: Add assignment_type column to distinguish
--   exams from shadow papers in the Personal Library.
-- =====================================================

-- 1. Add the column with a default of 'exam'
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'exam';

-- 2. Backfill existing shadow papers.
--    The shadow-paper API route stores a description starting
--    with "AI-generated shadow paper" in the content JSONB.
UPDATE assignments
SET assignment_type = 'shadow_paper'
WHERE content ->> 'description' LIKE 'AI-generated shadow paper%';

-- 3. Index for library filtering
CREATE INDEX IF NOT EXISTS idx_assignments_type
  ON assignments(assignment_type);

-- 4. Check constraint to enforce known values
ALTER TABLE assignments
  ADD CONSTRAINT chk_assignment_type
  CHECK (assignment_type IN ('exam', 'shadow_paper'));
