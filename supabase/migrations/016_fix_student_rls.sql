-- =====================================================
-- FIX: Student RLS Policies for Dashboard Visibility
-- =====================================================
-- Problem: Logged-in students cannot see:
-- 1. Classes they joined (names/subjects)
-- 2. Assignments for their enrolled classes
-- 3. Questions on those assignments
--
-- Solution: Add efficient RLS policies using security
-- definer functions to avoid recursion issues.
-- =====================================================

-- =====================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- =====================================================
-- These functions bypass RLS to check relationships efficiently

-- Check if a student is enrolled in a specific class
CREATE OR REPLACE FUNCTION public.student_enrolled_in_class(p_class_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.enrollments 
    WHERE class_id = p_class_id 
    AND student_id = p_student_id
  );
$$;

-- Get all class IDs a student is enrolled in
CREATE OR REPLACE FUNCTION public.get_student_class_ids(p_student_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT class_id 
  FROM public.enrollments 
  WHERE student_id = p_student_id;
$$;

-- Check if assignment belongs to a class the student is enrolled in
CREATE OR REPLACE FUNCTION public.student_can_view_assignment(p_assignment_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.assignments a
    INNER JOIN public.enrollments e ON e.class_id = a.class_id
    WHERE a.id = p_assignment_id 
    AND e.student_id = p_student_id
    AND a.status = 'published'
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.student_enrolled_in_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_class_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_view_assignment(uuid, uuid) TO authenticated;

-- =====================================================
-- 2. FIX ENROLLMENTS TABLE POLICIES
-- =====================================================
-- Students need to read their own enrollments

-- Drop existing policy if it exists (to recreate cleanly)
DROP POLICY IF EXISTS "Students can read own enrollments" ON public.enrollments;

-- Create: Students can read their own enrollments
CREATE POLICY "Students can read own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- =====================================================
-- 3. FIX CLASSES TABLE POLICIES FOR STUDENTS
-- =====================================================
-- Students need to read class details for classes they're enrolled in

-- Drop existing student policy if it exists
DROP POLICY IF EXISTS "Students can read enrolled classes" ON public.classes;

-- Create: Students can read classes they are enrolled in
-- Using security definer function to avoid RLS recursion
CREATE POLICY "Students can read enrolled classes"
  ON public.classes
  FOR SELECT
  USING (
    -- Check enrollment using security definer function
    public.student_enrolled_in_class(id, auth.uid())
  );

-- =====================================================
-- 4. FIX ASSIGNMENTS TABLE POLICIES FOR STUDENTS
-- =====================================================
-- Students need to see published assignments for their enrolled classes

-- Drop existing student policy if it exists
DROP POLICY IF EXISTS "Students can view published assignments for enrolled classes" ON public.assignments;

-- Create: Students can view published assignments for enrolled classes
CREATE POLICY "Students can view published assignments for enrolled classes"
  ON public.assignments
  FOR SELECT
  USING (
    status = 'published'
    AND class_id IN (SELECT public.get_student_class_ids(auth.uid()))
  );

-- =====================================================
-- 5. FIX ASSIGNMENT_QUESTIONS TABLE POLICIES
-- =====================================================
-- Students need to see questions for assignments they can view

-- Drop existing student policy if it exists
DROP POLICY IF EXISTS "Students can view questions for enrolled published assignments" ON public.assignment_questions;

-- Create: Students can view questions for published assignments in enrolled classes
CREATE POLICY "Students can view questions for enrolled published assignments"
  ON public.assignment_questions
  FOR SELECT
  USING (
    public.student_can_view_assignment(assignment_id, auth.uid())
  );

-- =====================================================
-- 6. ENSURE SUBMISSIONS POLICIES ARE CORRECT
-- =====================================================

-- Drop and recreate student submission policies for consistency
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can submit to published assignments" ON public.submissions;
DROP POLICY IF EXISTS "Students can update their ungraded submissions" ON public.submissions;

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
  ON public.submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can create submissions for published assignments they're enrolled in
CREATE POLICY "Students can submit to published assignments"
  ON public.submissions
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND public.student_can_view_assignment(assignment_id, auth.uid())
  );

-- Students can update their own ungraded submissions
CREATE POLICY "Students can update their ungraded submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    student_id = auth.uid()
    AND status = 'submitted'
  );

-- =====================================================
-- 7. ENSURE PROFILES CAN BE READ FOR TEACHER NAMES
-- =====================================================
-- Students need to see teacher names in their class list

-- Check if policy already exists, create if not
DO $$
BEGIN
  -- First ensure the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'student_can_view_teacher_profile'
  ) THEN
    -- Create function to check if user can view a teacher profile
    CREATE OR REPLACE FUNCTION public.student_can_view_teacher_profile(p_teacher_id uuid, p_student_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 
        FROM public.classes c
        INNER JOIN public.enrollments e ON e.class_id = c.id
        WHERE c.teacher_id = p_teacher_id 
        AND e.student_id = p_student_id
      );
    $func$;
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.student_can_view_teacher_profile(uuid, uuid) TO authenticated;

-- Drop existing profile policy to recreate with student access
DROP POLICY IF EXISTS "Users can read own and related profiles" ON public.profiles;

-- Create comprehensive profile read policy
CREATE POLICY "Users can read own and related profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can always read their own profile
    id = auth.uid()
    OR
    -- Teachers can read profiles of students in their classes
    public.is_teacher_of_student(id, auth.uid())
    OR
    -- Students can read profiles of their teachers
    public.student_can_view_teacher_profile(id, auth.uid())
  );

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Run these as a student to verify policies work:
--
-- -- Check enrolled classes
-- SELECT * FROM enrollments WHERE student_id = auth.uid();
--
-- -- Check class details
-- SELECT * FROM classes 
-- WHERE id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid());
--
-- -- Check assignments
-- SELECT * FROM assignments 
-- WHERE status = 'published' 
-- AND class_id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid());
--
-- -- Check assignment questions
-- SELECT aq.* FROM assignment_questions aq
-- INNER JOIN assignments a ON a.id = aq.assignment_id
-- WHERE a.status = 'published'
-- AND a.class_id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid());
