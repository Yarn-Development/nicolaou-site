-- =====================================================
-- RBAC Setup for Nicolaou's Maths Platform (Fixed)
-- =====================================================
-- This migration creates:
-- 1. user_role enum type
-- 2. profiles table linked to auth.users
-- 3. Automatic profile creation trigger
-- 4. Row Level Security policies (NON-RECURSIVE)
-- =====================================================

-- 1. CREATE ENUM TYPE FOR USER ROLES
-- =====================================================
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- 2. CREATE PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster role lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 3. CREATE FUNCTION TO AUTO-CREATE PROFILE
-- =====================================================
-- This function runs whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'student' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGER FOR AUTO PROFILE CREATION
-- =====================================================
-- Automatically create a profile when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. CREATE FUNCTION TO AUTO-UPDATE TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. DROP EXISTING POLICIES (if any)
-- =====================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- 8. CREATE NON-RECURSIVE RLS POLICIES
-- =====================================================
-- IMPORTANT: Use (SELECT auth.uid()) to prevent infinite recursion

-- Policy 1: Users can read their own profile
CREATE POLICY "Enable read access for authenticated users"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT auth.uid()) = id
  );

-- Policy 2: Users can update their own profile
-- NOTE: Users CANNOT change their own role
CREATE POLICY "Enable update for users based on id"
  ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id 
    AND (
      -- Only allow updating these fields, not role
      role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
      OR 
      -- Allow if the update doesn't touch the role column
      role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- 9. GRANT NECESSARY PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 10. CREATE FUNCTION TO GET CURRENT USER'S ROLE
-- =====================================================
-- This is a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 11. CREATE FUNCTION FOR ADMINS TO UPDATE ROLES
-- =====================================================
-- Only callable by admins via service role or with proper permissions
CREATE OR REPLACE FUNCTION public.update_user_role(
  user_id UUID,
  new_role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get the current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only admins can update roles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Update the target user's role
  UPDATE public.profiles
  SET role = new_role
  WHERE id = user_id;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES (Run these to test)
-- =====================================================
-- SELECT * FROM public.profiles;
-- SELECT public.get_my_role();

-- =====================================================
-- ADMIN NOTES
-- =====================================================
-- To make a user an admin, run this in SQL Editor:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
--
-- Or use the helper function as an admin:
-- SELECT public.update_user_role('user-uuid-here', 'teacher');
