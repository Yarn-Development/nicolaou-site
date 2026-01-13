# Supabase Migrations

## Quick Start (Recommended)

**If you're setting up for the first time OR fixing infinite recursion errors:**

1. Go to Supabase Dashboard → SQL Editor
2. Click "+ New query"
3. Copy and paste the contents of **`COMPLETE_SETUP.sql`**
4. Click "Run"
5. Done! ✅

This single script handles everything:
- Cleans up any broken policies
- Creates the profiles table
- Sets up non-recursive RLS policies
- Configures auto profile creation
- Adds admin helper functions

## Migration Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **COMPLETE_SETUP.sql** | ✅ All-in-one setup | **Use this!** Fresh install or fixing errors |
| 000_reset.sql | Clean slate | Only if manually resetting |
| 001_create_profiles_and_rbac.sql | ❌ Original (has bugs) | **Don't use** - causes infinite recursion |
| 002_fix_rls_policies.sql | Fixed policies | If you want step-by-step setup |

## After Running Migration

1. **Verify it worked:**
```sql
SELECT * FROM public.profiles;
```
Should show empty table with correct columns.

2. **Test profile creation:**
- Sign in with Google at http://localhost:3000
- Check the profiles table again
- Your profile should appear automatically

3. **Make yourself admin:**
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@gmail.com';
```

4. **Sign out and back in** to see the admin dashboard

## Common Issues

### "Infinite recursion detected in policy"
→ Run **COMPLETE_SETUP.sql** again

### "relation 'profiles' does not exist"
→ Run **COMPLETE_SETUP.sql**

### Profile not created on signup
→ Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Can't read profile
→ Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```
Should show 2 policies.

## Understanding the Fix

### The Problem
Original policies queried `profiles` while checking RLS on `profiles` → infinite loop!

### The Solution
New policies only check if `auth.uid() = id` (your own row) - simple and non-recursive.

For admin features, we use **SECURITY DEFINER functions** that bypass RLS:
- `get_my_role()` - Get your role
- `update_user_role(uuid, role)` - Change a user's role (admin only)

## Need More Help?

See the detailed guides:
- **FIXING_RLS_ERROR.md** - Complete troubleshooting guide
- **SUPABASE_SETUP.md** - Full setup walkthrough
