-- =====================================================
-- Migration 028: Create saved_questions table (Personal Bank)
-- =====================================================
-- Teachers can save individual questions to their personal bank
-- for reuse across assignments and exams.

CREATE TABLE IF NOT EXISTS saved_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  folder TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Prevent duplicate saves
  UNIQUE(teacher_id, question_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_questions_teacher ON saved_questions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_folder ON saved_questions(teacher_id, folder);

-- RLS Policies
ALTER TABLE saved_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own saved questions
CREATE POLICY "Teachers can view own saved questions"
  ON saved_questions FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can save questions
CREATE POLICY "Teachers can save questions"
  ON saved_questions FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own saved questions (change folder, notes)
CREATE POLICY "Teachers can update own saved questions"
  ON saved_questions FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can unsave questions
CREATE POLICY "Teachers can delete own saved questions"
  ON saved_questions FOR DELETE
  USING (auth.uid() = teacher_id);
