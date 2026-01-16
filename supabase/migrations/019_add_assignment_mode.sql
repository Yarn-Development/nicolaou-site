-- Migration: Add mode column to assignments table
-- Purpose: Distinguish between online (digital worksheet) and paper (printed exam) assignments

-- Add mode column with default 'online' (non-destructive - existing assignments default to online)
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'online';

-- Add check constraint to ensure only valid values
ALTER TABLE assignments 
ADD CONSTRAINT assignments_mode_check 
CHECK (mode IN ('online', 'paper'));

-- Add comment for documentation
COMMENT ON COLUMN assignments.mode IS 'Assignment type: online (students answer digitally) or paper (printed exam, marks entered manually)';

-- Create index for efficient filtering by mode
CREATE INDEX IF NOT EXISTS idx_assignments_mode ON assignments(mode);
