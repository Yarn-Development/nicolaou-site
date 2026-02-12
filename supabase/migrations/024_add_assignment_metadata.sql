-- Migration: Add metadata JSONB column to assignments table
-- Stores feedback/revision configuration separately from question content.
-- The Marking System reads metadata.generate_feedback and
-- metadata.include_remediation to decide whether to produce RAG sheets.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Back-fill existing rows: copy feedback flags from content → metadata
-- so the Marking System has a single canonical location.
UPDATE assignments
SET metadata = jsonb_build_object(
  'generate_feedback', COALESCE(content->>'generate_feedback', 'true')::boolean,
  'include_remediation', COALESCE(content->>'include_remediation', 'true')::boolean
)
WHERE metadata IS NULL OR metadata = '{}'::jsonb;

COMMENT ON COLUMN assignments.metadata IS
  'Stores non-question configuration: feedback sheet flags, revision settings, etc.';
