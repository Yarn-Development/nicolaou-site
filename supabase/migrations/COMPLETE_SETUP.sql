-- =====================================================
-- COMPLETE SETUP (Fresh Install)
-- =====================================================
-- Run this as a single script for fresh setup
-- If you have infinite recursion errors, this will fix them
-- =====================================================

-- PART 1: Clean up any existing setup
-- =====================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.update_user_role(UUID, user_role);

DROP TABLE IF EXISTS public.profiles;
DROP TYPE IF EXISTS user_role;

-- PART 2: Create fresh schema
-- =====================================================

-- 1. CREATE ENUM TYPE FOR USER ROLES
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- 2. CREATE PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 3. CREATE PROFILE AUTO-CREATION FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. CREATE UPDATED_AT FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE UPDATED_AT TRIGGER
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. CREATE NON-RECURSIVE RLS POLICIES
CREATE POLICY "Enable read access for authenticated users"
  ON public.profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Enable update for users based on id"
  ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id 
    AND role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- 9. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 10. CREATE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

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
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = user_id;
END;
$$;

-- =====================================================
-- ✅ SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Sign in with Google at http://localhost:3000
-- 2. Your profile will be auto-created with 'student' role
-- 3. To make yourself admin, run:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- 4. Sign out and back in to see admin dashboard
-- =====================================================

-- Verify setup
SELECT 
  'Profiles table created' as status,
  COUNT(*) as profile_count
FROM public.profiles;
