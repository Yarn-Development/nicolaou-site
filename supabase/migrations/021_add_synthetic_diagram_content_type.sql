-- Migration: Add synthetic_image to content_type
-- Purpose: Support AI-generated geometry questions with matplotlib diagrams

-- The database uses an ENUM type for content_type
-- Add the new value to the enum (this cannot be done inside a transaction in some PG versions)

-- Method 1: Try adding to enum directly
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'synthetic_image';

-- Note: If the above fails with "cannot be executed inside a transaction block",
-- you may need to run it outside a transaction or use the Supabase SQL Editor
-- with "Run as single statement" option.

-- Update column comment
COMMENT ON COLUMN public.questions.content_type IS 'Source type: generated_text (AI text), image_ocr (scanned), official_past_paper (exam boards), or synthetic_image (AI-generated with diagram)';
