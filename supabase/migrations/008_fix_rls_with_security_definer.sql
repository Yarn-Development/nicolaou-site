-- =====================================================
-- FIX: RLS Policies Using Security Definer Functions
-- =====================================================
-- This fixes infinite recursion by using security definer
-- functions that bypass RLS when checking relationships
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Teachers can read own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can read enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;

DROP POLICY IF EXISTS "Students can read own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can read class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can join classes" ON public.enrollments;
DROP POLICY IF EXISTS "Students can leave classes" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can remove students from classes" ON public.enrollments;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================
-- These functions bypass RLS to check relationships

-- Check if user is enrolled in a class
CREATE OR REPLACE FUNCTION public.is_student_enrolled(p_class_id uuid, p_user_id uuid)
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
    AND student_id = p_user_id
  );
$$;

-- Check if user owns a class
CREATE OR REPLACE FUNCTION public.is_class_owner(p_class_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.classes 
    WHERE id = p_class_id 
    AND teacher_id = p_user_id
  );
$$;

-- =====================================================
-- SIMPLIFIED RLS POLICIES FOR CLASSES
-- =====================================================

-- Teachers can read their own classes
CREATE POLICY "Teachers can read own classes"
  ON public.classes
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Students can read classes they are enrolled in
CREATE POLICY "Students can read enrolled classes"
  ON public.classes
  FOR SELECT
  USING (public.is_student_enrolled(id, auth.uid()));

-- Teachers can create classes
CREATE POLICY "Teachers can create classes"
  ON public.classes
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own classes
CREATE POLICY "Teachers can update own classes"
  ON public.classes
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete own classes"
  ON public.classes
  FOR DELETE
  USING (teacher_id = auth.uid());

-- =====================================================
-- SIMPLIFIED RLS POLICIES FOR ENROLLMENTS
-- =====================================================

-- Students can read their own enrollments
CREATE POLICY "Students can read own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can read enrollments for their classes
CREATE POLICY "Teachers can read class enrollments"
  ON public.enrollments
  FOR SELECT
  USING (public.is_class_owner(class_id, auth.uid()));

-- Students can create enrollments (join classes)
CREATE POLICY "Students can join classes"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can delete their own enrollments (leave class)
CREATE POLICY "Students can leave classes"
  ON public.enrollments
  FOR DELETE
  USING (student_id = auth.uid());

-- Teachers can remove students from their classes
CREATE POLICY "Teachers can remove students from classes"
  ON public.enrollments
  FOR DELETE
  USING (public.is_class_owner(class_id, auth.uid()));

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_student_enrolled(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_owner(uuid, uuid) TO authenticated;
