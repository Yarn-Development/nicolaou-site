# 🔧 Fixing "Infinite Recursion in Policy" Error

## Problem

You're seeing this error:
```
Error fetching profile: infinite recursion detected in policy for relation "profiles"
```

## Root Cause

The original RLS policies had circular dependencies. When checking if a user is an admin, the policy queries the `profiles` table, which triggers RLS checks, which query `profiles` again → infinite loop!

## Solution: Run These SQL Scripts in Order

### Step 1: Reset Everything

Go to Supabase Dashboard → **SQL Editor** → Click "+ New query"

Paste and run this script:

```sql
-- =====================================================
-- CLEAN RESET - Drops everything
-- =====================================================

-- 1. Drop all policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

-- 3. Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.update_user_role(UUID, user_role);

-- 4. Drop table (WARNING: This deletes all user profiles!)
DROP TABLE IF EXISTS public.profiles;

-- 5. Drop enum type
DROP TYPE IF EXISTS user_role;
```

**Note**: This will delete all existing user profiles! Users will need to sign in again to recreate their profiles.

### Step 2: Run Fixed Migration

Still in SQL Editor, create a **new query** and paste the contents of:

`supabase/migrations/002_fix_rls_policies.sql`

This creates:
- ✅ Non-recursive RLS policies
- ✅ Proper security definer functions
- ✅ Auto profile creation trigger
- ✅ Role management function

Click "Run" (or Ctrl/Cmd + Enter)

### Step 3: Verify Setup

Run this verification query:

```sql
-- Check that everything is set up correctly
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

You should see 2 policies:
1. "Enable read access for authenticated users"
2. "Enable update for users based on id"

### Step 4: Test Profile Creation

1. Sign out of your app if logged in
2. Clear browser cookies
3. Sign in with Google again
4. Check in Supabase Dashboard → **Table Editor** → `profiles`
5. Your profile should be created automatically

## What Changed?

### Before (Broken):
```sql
-- ❌ CAUSES INFINITE RECURSION
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles  -- ← Queries profiles while checking RLS!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### After (Fixed):
```sql
-- ✅ WORKS - Simple, non-recursive
CREATE POLICY "Enable read access for authenticated users"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT auth.uid()) = id  -- ← Only checks own row
  );
```

## New Approach for Admin Features

Since we can't use RLS to check if a user is admin (causes recursion), we use **Security Definer Functions** instead:

### Get Your Own Role (Non-Recursive):
```sql
SELECT public.get_my_role();
```

### Update Roles (Admin Only):
```sql
-- Must be called by an admin
SELECT public.update_user_role(
  'user-uuid-here'::uuid, 
  'teacher'::user_role
);
```

## Making Your First Admin

Run this in SQL Editor (replace with your email):

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@gmail.com';
```

Then sign out and sign back in.

## If You Still See Errors

### Error: "relation 'profiles' does not exist"
**Solution**: Run Step 2 migration again

### Error: "type 'user_role' does not exist"
**Solution**: Run Step 1 reset, then Step 2 migration

### Error: "function handle_new_user() does not exist"
**Solution**: Run Step 2 migration

### Error: Profile not created on signup
**Solution**: 
1. Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
2. If not found, run Step 2 migration again

### Error: Can't update profile
**Solution**:
1. Check policies exist:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```
2. If none found, run Step 2 migration again

## Testing Checklist

- [ ] Reset database (Step 1)
- [ ] Run fixed migration (Step 2)
- [ ] Verify policies exist (Step 3)
- [ ] Sign out of app
- [ ] Clear browser cookies
- [ ] Sign in with Google
- [ ] Profile created automatically
- [ ] No "infinite recursion" error
- [ ] Can view student dashboard
- [ ] Make yourself admin via SQL
- [ ] Sign out and back in
- [ ] Can access teacher dashboard

## Prevention

Going forward, **NEVER** create RLS policies that:
- Query the same table they're protecting
- Use `EXISTS (SELECT ... FROM profiles)` in a `profiles` policy
- Call functions that query `profiles` internally

Instead:
- Use simple `auth.uid() = id` checks
- Use SECURITY DEFINER functions for admin checks
- Keep policies as simple as possible

## Need Help?

If still stuck:
1. Check Supabase logs: Dashboard → Database → Logs
2. Run this debug query:
```sql
SELECT 
  schemaname, 
  tablename, 
  tableowner, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';
```
3. Ensure RLS is enabled (rowsecurity = true)
4. Check that policies are listed in Step 3

---

**The infinite recursion is now fixed!** 🎉

Your users can:
- ✅ Read their own profile
- ✅ Update their own profile (except role)
- ❌ Cannot change their own role
- ❌ Cannot read other users' profiles (unless admin)

Admins must use SQL or the `update_user_role()` function to manage roles.
