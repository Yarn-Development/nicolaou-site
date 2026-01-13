# Supabase RBAC Setup Guide

## Complete Role-Based Access Control Implementation for Nicolaou's Maths Platform

This guide will walk you through setting up Role-Based Access Control (RBAC) with Google Authentication for your Next.js 15 application using Supabase.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Configuration](#database-configuration)
4. [Google OAuth Configuration](#google-oauth-configuration)
5. [Environment Variables](#environment-variables)
6. [Testing the Setup](#testing-the-setup)
7. [User Role Management](#user-role-management)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Supabase account ([sign up here](https://supabase.com))
- Google Cloud Platform account (for OAuth)
- Node.js 18+ installed
- Next.js 15 project (already set up)

---

## Supabase Project Setup

### Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Project Name**: `nicolaou-maths` (or your choice)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for project initialization

### Step 2: Get API Credentials

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Find these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
3. Keep this tab open - you'll need these values soon

---

## Database Configuration

### Step 3: Run Database Migration

**IMPORTANT**: Use the FIXED migration to avoid infinite recursion errors!

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click "+ New query"
3. Open the file `supabase/migrations/002_fix_rls_policies.sql` in your project
4. Copy the ENTIRE contents and paste into the SQL Editor
5. Click "Run" (or press Ctrl/Cmd + Enter)
6. You should see: "Success. No rows returned"

**What this migration does:**
- Creates `user_role` enum type (`student`, `teacher`, `admin`)
- Creates `profiles` table linked to `auth.users`
- Sets up automatic profile creation trigger
- Configures **non-recursive** Row Level Security (RLS) policies
- Adds helper functions for role management

**Note**: If you previously ran `001_create_profiles_and_rbac.sql` and got "infinite recursion" errors, see `FIXING_RLS_ERROR.md` for reset instructions.

### Step 4: Verify Database Setup

Run this query in SQL Editor to verify:

```sql
SELECT * FROM public.profiles;
```

You should see an empty table with columns: `id`, `email`, `full_name`, `role`, `avatar_url`, `created_at`, `updated_at`.

---

## Google OAuth Configuration

### Step 5: Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click "Enable"

### Step 6: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - Choose "External"
   - Fill in required fields:
     - App name: "Nicolaou's Maths"
     - User support email: Your email
     - Developer contact: Your email
   - Save and Continue through all steps
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Nicolaou Maths - Production"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`
       (Replace `xxxxxxxxxxxxx` with your Supabase project URL)
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**

### Step 7: Configure Google OAuth in Supabase

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find "Google" and click to expand
3. Enable Google provider
4. Paste your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Leave "Skip nonce checks" UNCHECKED
6. Click "Save"

---

## Environment Variables

### Step 8: Configure Environment Variables

1. In your project root, find `.env.example`
2. Create a new file called `.env.local`
3. Copy the template from `.env.example` and fill in:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
```

4. Replace:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Project URL from Step 2
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon public key from Step 2

**IMPORTANT**: Never commit `.env.local` to Git!

---

## Testing the Setup

### Step 9: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Step 10: Test Google Sign-In Flow

1. **Homepage**: You should see "SIGN IN WITH GOOGLE" button
2. Click the button
3. Select your Google account
4. Grant permissions
5. You'll be redirected back to the app

**Expected behavior:**
- New users automatically get `student` role
- Students are redirected to `/student-dashboard`
- Teachers/Admins are redirected to `/dashboard`

### Step 11: Verify Profile Creation

1. Go to Supabase Dashboard → **Table Editor** → `profiles`
2. You should see your new profile with:
   - `id`: Your user ID
   - `email`: Your Google email
   - `full_name`: Your Google display name
   - `role`: `student` (default)
   - `avatar_url`: Your Google profile picture URL

---

## User Role Management

### How to Change User Roles

#### Option 1: Via Supabase Dashboard (Recommended for Testing)

1. Go to **Table Editor** → `profiles`
2. Find the user you want to update
3. Click on their row
4. Change `role` from `student` to `teacher` or `admin`
5. Click "Save"
6. User needs to log out and log back in to see changes

#### Option 2: Via SQL (For Bulk Updates)

```sql
-- Make a user a teacher
UPDATE public.profiles
SET role = 'teacher'
WHERE email = 'teacher@example.com';

-- Make a user an admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';

-- List all teachers
SELECT email, role, created_at
FROM public.profiles
WHERE role = 'teacher';
```

### Creating Admin Users

For your first admin:

```sql
-- Set yourself as admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@gmail.com';
```

Then log out and log back in.

---

## Role-Based Access Control

### Access Rules

| Role | Access |
|------|--------|
| **Student** | `/student-dashboard` only |
| **Teacher** | `/dashboard`, `/exam-builder` |
| **Admin** | `/dashboard`, `/exam-builder`, `/admin` |

### Protection Mechanisms

1. **Middleware** (`middleware.ts`):
   - Checks authentication status
   - Fetches user role from database
   - Redirects unauthorized users
   - Prevents students from accessing teacher routes

2. **Row Level Security (RLS)**:
   - Users can read/update their own profile
   - Users cannot change their own role
   - Admins can read/update all profiles

3. **Helper Functions** (`lib/auth/helpers.ts`):
   - `getCurrentUser()` - Get authenticated user
   - `getCurrentProfile()` - Get user profile with role
   - `requireAuth()` - Throw error if not authenticated
   - `requireTeacher()` - Throw error if not teacher/admin
   - `requireAdmin()` - Throw error if not admin

---

## Troubleshooting

### Common Issues

#### 1. "Infinite recursion detected in policy for relation 'profiles'"

**This is the most common error!**

**Solution**: See the complete fix guide: **`FIXING_RLS_ERROR.md`**

Quick fix:
1. Run `supabase/migrations/000_reset.sql` to clean up
2. Run `supabase/migrations/002_fix_rls_policies.sql` to recreate with fixed policies
3. Sign out and sign back in

#### 2. "Auth required" error when accessing dashboards

**Solution**:
- Make sure you're logged in
- Check browser cookies are enabled
- Clear cookies and try signing in again

#### 2. Google OAuth error: "redirect_uri_mismatch"

**Solution**:
- Verify redirect URI in Google Cloud Console matches exactly:
  `https://your-project-id.supabase.co/auth/v1/callback`
- No trailing slashes
- Check for typos

#### 3. Profile not created automatically

**Solution**:
- Check if trigger is created:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- Re-run the migration SQL
- Check Supabase logs for errors

#### 4. "Cannot read properties of null (reading 'role')"

**Solution**:
- Profile wasn't created
- Delete user from **Authentication** → **Users**
- Sign up again
- Profile should be created automatically

#### 5. Student can access teacher dashboard

**Solution**:
- Clear browser cache
- Make sure middleware.ts is at project root
- Check middleware config matcher pattern
- Restart dev server

### Debug Checklist

```bash
# 1. Check if Supabase packages are installed
npm list @supabase/supabase-js @supabase/ssr

# 2. Verify environment variables
cat .env.local

# 3. Check TypeScript compilation
npx tsc --noEmit

# 4. Restart dev server
npm run dev
```

---

## Security Best Practices

### DO:
- ✅ Keep `.env.local` out of version control
- ✅ Use RLS policies for database security
- ✅ Validate user roles on both client and server
- ✅ Regularly audit user roles
- ✅ Use HTTPS in production

### DON'T:
- ❌ Store API keys in client-side code
- ❌ Trust client-side role checks alone
- ❌ Allow users to change their own roles
- ❌ Expose service_role key to frontend
- ❌ Skip RLS policies

---

## Next Steps

1. **Test all three roles**: Create test accounts for student, teacher, and admin
2. **Customize dashboards**: Add role-specific features
3. **Add email verification**: Enable in Supabase Auth settings
4. **Set up production**: Deploy to Vercel/Netlify and update Google OAuth URLs
5. **Monitor usage**: Check Supabase Dashboard → Database → Logs

---

## File Structure Reference

```
nicolaou-site/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── dashboard/                # Teacher/Admin dashboard
│   │   └── exam-builder/
│   │       └── page.tsx
│   ├── student-dashboard/        # Student dashboard
│   │   ├── page.tsx
│   │   └── student-dashboard-client.tsx
│   └── page.tsx                  # Landing page with Google Sign-In
├── components/
│   ├── auth/
│   │   ├── google-sign-in-button.tsx
│   │   └── sign-out-button.tsx
│   ├── dashboard-header.tsx     # Updated with sign-out
│   └── hero-section.tsx         # Updated with auth state
├── lib/
│   ├── auth/
│   │   └── helpers.ts           # Server-side auth helpers
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   └── middleware.ts        # Middleware client
│   └── types/
│       └── database.ts          # TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_create_profiles_and_rbac.sql
├── middleware.ts                # RBAC middleware
├── .env.example                 # Environment template
└── .env.local                   # Your secrets (gitignored)
```

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Database → Logs
2. Check browser console for errors
3. Verify all steps in this guide
4. Check Supabase documentation: https://supabase.com/docs

---

## Summary

You now have a complete RBAC system with:

- ✅ Google OAuth authentication
- ✅ Automatic profile creation
- ✅ Three user roles (student, teacher, admin)
- ✅ Role-based route protection
- ✅ Row Level Security
- ✅ Server and client auth helpers
- ✅ Separate dashboards for students and teachers

**Happy coding!** 🚀
