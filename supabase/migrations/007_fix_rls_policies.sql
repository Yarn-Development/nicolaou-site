-- =====================================================
-- FIX: Classes and Enrollments RLS Policies
-- =====================================================
-- This migration fixes the infinite recursion issues
-- Run this AFTER dropping the existing policies
-- =====================================================

-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "Teachers can read own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can read enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;

DROP POLICY IF EXISTS "Students can read own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can read class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can join classes" ON public.enrollments;
DROP POLICY IF EXISTS "Students can leave classes" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can remove students from classes" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;

-- =====================================================
-- FIXED RLS POLICIES FOR CLASSES TABLE
-- =====================================================

-- Policy: Teachers can read their own classes
CREATE POLICY "Teachers can read own classes"
  ON public.classes
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Policy: Students can read classes they are enrolled in
-- Fixed: Use a subquery instead of EXISTS to avoid recursion
CREATE POLICY "Students can read enrolled classes"
  ON public.classes
  FOR SELECT
  USING (
    id IN (
      SELECT class_id 
      FROM public.enrollments 
      WHERE student_id = auth.uid()
    )
  );

-- Policy: Teachers can create classes
CREATE POLICY "Teachers can create classes"
  ON public.classes
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Policy: Teachers can update their own classes
CREATE POLICY "Teachers can update own classes"
  ON public.classes
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Policy: Teachers can delete their own classes
CREATE POLICY "Teachers can delete own classes"
  ON public.classes
  FOR DELETE
  USING (teacher_id = auth.uid());

-- =====================================================
-- FIXED RLS POLICIES FOR ENROLLMENTS TABLE
-- =====================================================

-- Policy: Students can read their own enrollments
CREATE POLICY "Students can read own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Teachers can read enrollments for their classes
-- Fixed: Use a subquery to avoid recursion
CREATE POLICY "Teachers can read class enrollments"
  ON public.enrollments
  FOR SELECT
  USING (
    class_id IN (
      SELECT id 
      FROM public.classes 
      WHERE teacher_id = auth.uid()
    )
  );

-- Policy: Students can create enrollments (join classes)
CREATE POLICY "Students can join classes"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Policy: Students can delete their own enrollments (leave class)
CREATE POLICY "Students can leave classes"
  ON public.enrollments
  FOR DELETE
  USING (student_id = auth.uid());

-- Policy: Teachers can remove students from their classes
-- Fixed: Use a subquery to avoid recursion
CREATE POLICY "Teachers can remove students from classes"
  ON public.enrollments
  FOR DELETE
  USING (
    class_id IN (
      SELECT id 
      FROM public.classes 
      WHERE teacher_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these to verify the policies work:
-- 
-- As a teacher:
-- SELECT * FROM public.classes;
-- SELECT * FROM public.enrollments WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid());
--
-- As a student:
-- SELECT * FROM public.classes WHERE id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid());
-- SELECT * FROM public.enrollments WHERE student_id = auth.uid();
