-- Migration 029: Add onboarding fields to profiles table
-- Adds institution column and onboarding_completed flag

-- Add institution column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Add onboarding_completed flag (defaults to false for new users)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill: Mark existing users with a role and full_name as onboarding-completed
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE full_name IS NOT NULL 
  AND full_name != '';

-- Comment for documentation
COMMENT ON COLUMN public.profiles.institution IS 'School or institution name, set during onboarding';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the onboarding wizard';
