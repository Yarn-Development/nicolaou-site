-- =====================================================
-- FIX: Allow Teachers to Read Student Profiles
-- =====================================================
-- Problem: Teachers can see enrollment count but cannot
-- view student details because RLS on profiles table
-- only allows users to read their OWN profile.
--
-- Solution: Add a policy that allows teachers to read
-- profiles of students enrolled in their classes.
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

-- =====================================================
-- SECURITY DEFINER FUNCTION
-- =====================================================
-- Check if a teacher owns any class that a student is enrolled in
-- This bypasses RLS to prevent recursion issues

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id uuid, p_teacher_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    INNER JOIN public.classes c ON c.id = e.class_id
    WHERE e.student_id = p_student_id
    AND c.teacher_id = p_teacher_id
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_teacher_of_student(uuid, uuid) TO authenticated;

-- =====================================================
-- NEW RLS POLICY FOR PROFILES
-- =====================================================
-- Users can read:
-- 1. Their own profile (any role)
-- 2. Profiles of students in their classes (teachers only)

CREATE POLICY "Users can read own and related profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can always read their own profile
    id = auth.uid()
    OR
    -- Teachers can read profiles of students in their classes
    public.is_teacher_of_student(id, auth.uid())
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- As a teacher, you should now be able to run:
-- SELECT * FROM public.profiles WHERE id IN (
--   SELECT student_id FROM enrollments WHERE class_id IN (
--     SELECT id FROM classes WHERE teacher_id = auth.uid()
--   )
-- );
