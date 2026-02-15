-- =====================================================
-- Migration: 027_fix_revision_lists_rls_recursion.sql
-- Description: Fix infinite recursion in revision_lists RLS policies
--
-- Problem: Circular dependency between revision_lists and 
-- student_revision_allocations policies:
--   revision_lists_student_select -> reads student_revision_allocations
--   sra_teacher_all -> reads revision_lists
--   = infinite recursion (Postgres error 42P17)
--
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS
-- to check ownership, then use those in the child table policies
-- instead of directly querying revision_lists (which triggers RLS).
-- =====================================================

-- =====================================================
-- 1. Helper function: check if user owns a revision list
--    SECURITY DEFINER bypasses RLS on revision_lists
-- =====================================================

CREATE OR REPLACE FUNCTION is_revision_list_owner(p_revision_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revision_lists
    WHERE id = p_revision_list_id
    AND created_by = p_user_id
  );
$$;

-- =====================================================
-- 2. Fix student_revision_allocations policies
--    Drop sra_teacher_all (causes recursion) and replace
--    with a policy using the helper function
-- =====================================================

DROP POLICY IF EXISTS sra_teacher_all ON student_revision_allocations;

CREATE POLICY sra_teacher_all ON student_revision_allocations
  FOR ALL
  TO authenticated
  USING (is_revision_list_owner(revision_list_id, auth.uid()));

-- =====================================================
-- 3. Fix revision_list_questions policies
--    Same pattern — drop and replace rlq_teacher_all
-- =====================================================

DROP POLICY IF EXISTS rlq_teacher_all ON revision_list_questions;

CREATE POLICY rlq_teacher_all ON revision_list_questions
  FOR ALL
  TO authenticated
  USING (is_revision_list_owner(revision_list_id, auth.uid()));

-- =====================================================
-- Done! The circular dependency is broken because
-- is_revision_list_owner() uses SECURITY DEFINER to
-- read revision_lists without triggering RLS policies.
-- =====================================================
