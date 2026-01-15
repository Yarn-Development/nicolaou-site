-- =====================================================
-- FIX: Allow students to lookup classes by join code
-- =====================================================
-- Students need to be able to read a class to join it
-- This creates an RPC function that bypasses RLS for join code lookup
-- =====================================================

-- Function to lookup class by join code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.lookup_class_by_join_code(p_join_code text)
RETURNS TABLE (
  id uuid,
  name text,
  subject text,
  teacher_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, name, subject, teacher_id
  FROM public.classes
  WHERE join_code = UPPER(TRIM(p_join_code))
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_class_by_join_code(text) TO authenticated;

-- Note: This is safe because:
-- 1. The join_code is a 6-character random string (security through obscurity)
-- 2. Students can only see basic info (id, name, subject, teacher_id)
-- 3. They can't see enrolled students until after joining
-- 4. The actual enrollment still goes through RLS policies
