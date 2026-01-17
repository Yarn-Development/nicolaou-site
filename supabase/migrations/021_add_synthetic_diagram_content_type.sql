-- Migration: Add synthetic_diagram to content_type
-- Purpose: Support AI-generated geometry questions with matplotlib diagrams

-- The questions table uses a TEXT column with a CHECK constraint (not an ENUM)
-- Drop and recreate the constraint to include 'synthetic_diagram'

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_content_type_check;

ALTER TABLE public.questions 
ADD CONSTRAINT questions_content_type_check 
CHECK (content_type IN ('generated_text', 'image_ocr', 'official_past_paper', 'synthetic_diagram'));

-- Update column comment
COMMENT ON COLUMN public.questions.content_type IS 'Source type: generated_text (AI text), image_ocr (scanned), official_past_paper (exam boards), or synthetic_diagram (AI-generated with diagram)';
