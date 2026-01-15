-- =====================================================
-- Classes and Enrollments Schema
-- =====================================================
-- This migration creates:
-- 1. classes table for teacher-created classes
-- 2. enrollments table for student-class relationships
-- 3. Auto-generate join code function
-- 4. Row Level Security policies
-- =====================================================

-- 1. CREATE CLASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Maths',
  join_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX idx_classes_join_code ON public.classes(join_code);

-- 2. CREATE ENROLLMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: A student can only be in a class once
  UNIQUE(class_id, student_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);

-- 3. FUNCTION: Generate Unique Join Code
-- =====================================================
-- Generates a random 6-character string (uppercase letters + numbers)
-- Excludes ambiguous characters: I, 1, 0, O
CREATE OR REPLACE FUNCTION public.generate_unique_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, 1, 0, O
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    
    -- Generate 6 random characters
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = result) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. TRIGGER: Auto-generate join code on insert
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_join_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set join_code if it's NULL or empty
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := public.generate_unique_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_class_created ON public.classes;
CREATE TRIGGER on_class_created
  BEFORE INSERT ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_join_code();

-- 5. TRIGGER: Auto-update timestamp
-- =====================================================
DROP TRIGGER IF EXISTS on_class_updated ON public.classes;
CREATE TRIGGER on_class_updated
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR CLASSES TABLE
-- =====================================================

-- Policy: Teachers can read their own classes
CREATE POLICY "Teachers can read own classes"
  ON public.classes
  FOR SELECT
  USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Policy: Students can read classes they are enrolled in
CREATE POLICY "Students can read enrolled classes"
  ON public.classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.class_id = classes.id
      AND enrollments.student_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Policy: Teachers can create classes
CREATE POLICY "Teachers can create classes"
  ON public.classes
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Policy: Teachers can update their own classes
CREATE POLICY "Teachers can update own classes"
  ON public.classes
  FOR UPDATE
  USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Policy: Teachers can delete their own classes
CREATE POLICY "Teachers can delete own classes"
  ON public.classes
  FOR DELETE
  USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Policy: Admins can do everything with classes
CREATE POLICY "Admins can manage all classes"
  ON public.classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. RLS POLICIES FOR ENROLLMENTS TABLE
-- =====================================================

-- Policy: Students can read their own enrollments
CREATE POLICY "Students can read own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Teachers can read enrollments for their classes
CREATE POLICY "Teachers can read class enrollments"
  ON public.enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Policy: Students can create enrollments (join classes)
CREATE POLICY "Students can join classes"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Policy: Students can delete their own enrollments (leave class)
CREATE POLICY "Students can leave classes"
  ON public.enrollments
  FOR DELETE
  USING (student_id = auth.uid());

-- Policy: Teachers can remove students from their classes
CREATE POLICY "Teachers can remove students from classes"
  ON public.enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Policy: Admins can manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON public.enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 9. GRANT NECESSARY PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.enrollments TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get student count for a class
CREATE OR REPLACE FUNCTION public.get_class_student_count(class_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.enrollments WHERE class_id = class_id_param;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES (Run these to test)
-- =====================================================
-- SELECT * FROM public.classes;
-- SELECT * FROM public.enrollments;
-- SELECT public.generate_unique_join_code();
