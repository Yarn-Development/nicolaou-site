# Authentication Flow Diagram

## User Sign-In Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER CLICKS                                  │
│                    "Sign in with Google"                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GoogleSignInButton.tsx                                             │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ supabase.auth.signInWithOAuth({                           │     │
│  │   provider: 'google',                                     │     │
│  │   redirectTo: '/auth/callback'                            │     │
│  │ })                                                        │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE OAUTH SCREEN                              │
│              (User logs in with Google account)                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase Auth Service                                              │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ 1. Receives Google auth code                             │     │
│  │ 2. Creates user in auth.users (if new)                   │     │
│  │ 3. TRIGGER fires → handle_new_user()                     │     │
│  │ 4. Creates profile in public.profiles                    │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  /auth/callback/route.ts                                            │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ 1. Exchange code for session                             │     │
│  │ 2. Fetch user's profile from profiles table              │     │
│  │ 3. Check role:                                           │     │
│  │    - student     → redirect to /student-dashboard        │     │
│  │    - teacher     → redirect to /dashboard                │     │
│  │    - admin       → redirect to /dashboard                │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      middleware.ts                                  │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ 1. Intercepts all requests                               │     │
│  │ 2. Checks if user is authenticated                       │     │
│  │ 3. Fetches user role from profiles table                 │     │
│  │ 4. Enforces access rules:                                │     │
│  │    - Students can't access /dashboard                    │     │
│  │    - Teachers can't access /student-dashboard            │     │
│  │    - Unauthenticated users redirected to /               │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   USER SEES DASHBOARD                               │
│         (Student Dashboard OR Teacher Dashboard)                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Trigger Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    New User Signs Up                                │
│                   (via Google OAuth)                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  auth.users table                                                   │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ INSERT INTO auth.users                                    │     │
│  │   id:    uuid (auto-generated)                            │     │
│  │   email: user@gmail.com                                   │     │
│  │   raw_user_meta_data: {                                   │     │
│  │     name: "John Doe",                                     │     │
│  │     avatar_url: "https://..."                             │     │
│  │   }                                                       │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ TRIGGER: on_auth_user_created
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  handle_new_user() function                                         │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ AUTOMATICALLY creates profile:                           │     │
│  │                                                           │     │
│  │ INSERT INTO public.profiles                              │     │
│  │   id:         (from NEW.id)                              │     │
│  │   email:      (from NEW.email)                           │     │
│  │   full_name:  (from metadata)                            │     │
│  │   role:       'student' (DEFAULT)                        │     │
│  │   avatar_url: (from metadata)                            │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  public.profiles table                                              │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ Row created:                                              │     │
│  │   id:         abc-123-def-456                             │     │
│  │   email:      user@gmail.com                              │     │
│  │   full_name:  John Doe                                    │     │
│  │   role:       student                                     │     │
│  │   avatar_url: https://lh3.googleusercontent.com/...       │     │
│  │   created_at: 2026-01-13 10:30:00                         │     │
│  │   updated_at: 2026-01-13 10:30:00                         │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Row Level Security (RLS) Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│         User tries to read profiles table                           │
│         SELECT * FROM profiles WHERE id = 'abc-123'                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RLS Policy Check: "Enable read access for authenticated users"    │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ USING ((SELECT auth.uid()) = id)                          │     │
│  │                                                           │     │
│  │ ✓ If auth.uid() matches the row's id → ALLOW             │     │
│  │ ✗ If auth.uid() doesn't match → DENY                     │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Result                                       │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ ✓ User can read their OWN profile                         │     │
│  │ ✗ User CANNOT read other users' profiles                  │     │
│  │ ✗ User CANNOT change their own role                       │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Role-Based Routing

```
                         middleware.ts
                              │
                              ▼
                    ┌─────────────────┐
                    │ Fetch user role │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          ┌─────────┐  ┌─────────┐  ┌────────┐
          │ STUDENT │  │ TEACHER │  │ ADMIN  │
          └────┬────┘  └────┬────┘  └────┬───┘
               │            │            │
               ▼            ▼            ▼
    ┌──────────────┐  ┌──────────┐  ┌──────────┐
    │ /student-    │  │ /dashboard│ │ /dashboard│
    │  dashboard   │  │ /exam-    │ │ /exam-    │
    │              │  │  builder  │ │  builder  │
    │              │  │           │ │ /admin    │
    └──────────────┘  └──────────┘  └──────────┘
          ✓                ✓             ✓
    ┌──────────────┐  ┌──────────┐  ┌──────────┐
    │ ✗ /dashboard │  │ ✗ /student│ │ ✓ All    │
    │              │  │  -dashboard│ │  routes  │
    └──────────────┘  └──────────┘  └──────────┘
       BLOCKED          BLOCKED       ALLOWED
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Layer 1: Middleware                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Checks authentication status                           │  │
│  │ • Fetches user role from database                        │  │
│  │ • Redirects based on role                                │  │
│  │ • Prevents unauthorized route access                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                Layer 2: Server Components                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • requireAuth() - Throws if not authenticated            │  │
│  │ • requireTeacher() - Throws if not teacher/admin         │  │
│  │ • requireAdmin() - Throws if not admin                   │  │
│  │ • getCurrentProfile() - Gets user data                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            Layer 3: Row Level Security (Database)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Users can only read their own profile                  │  │
│  │ • Users can only update their own profile                │  │
│  │ • Users CANNOT change their own role                     │  │
│  │ • Enforced at PostgreSQL level                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure Map

```
nicolaou-site/
│
├── app/
│   ├── page.tsx ─────────────────────► Landing page with Google Sign-In
│   │
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts ──────────────► OAuth callback handler
│   │                                    (exchanges code, checks role)
│   │
│   ├── dashboard/ ───────────────────► TEACHER/ADMIN ONLY
│   │   └── exam-builder/
│   │       └── page.tsx
│   │
│   └── student-dashboard/ ───────────► STUDENTS ONLY
│       ├── page.tsx ─────────────────► Server: auth check, fetch profile
│       └── student-dashboard-client.tsx ► Client: UI with profile data
│
├── components/
│   ├── auth/
│   │   ├── google-sign-in-button.tsx ► Sign-in component
│   │   └── sign-out-button.tsx ──────► Sign-out component
│   │
│   └── dashboard-header.tsx ─────────► Has sign-out in dropdown
│
├── lib/
│   ├── auth/
│   │   └── helpers.ts ───────────────► getCurrentUser(), requireAuth(), etc.
│   │
│   ├── supabase/
│   │   ├── client.ts ────────────────► For 'use client' components
│   │   ├── server.ts ────────────────► For server components
│   │   └── middleware.ts ────────────► For middleware
│   │
│   └── types/
│       └── database.ts ──────────────► TypeScript types
│
├── middleware.ts ────────────────────► RBAC logic, route protection
│
└── supabase/
    └── migrations/
        ├── COMPLETE_SETUP.sql ───────► ✅ RUN THIS!
        ├── 000_reset.sql
        ├── 002_fix_rls_policies.sql
        └── README.md
```

## Key Concepts

### 1. **Authentication** (Who are you?)
- Handled by Supabase Auth + Google OAuth
- User signs in with Google account
- Session stored in cookies

### 2. **Authorization** (What can you do?)
- Role stored in `profiles.role`
- Three roles: student, teacher, admin
- Checked by middleware on every request

### 3. **Row Level Security** (What can you access?)
- PostgreSQL-level security
- Users can only read/update own profile
- Cannot change own role
- Prevents data leaks

### 4. **Security Definer Functions** (Admin operations)
- Bypass RLS for specific operations
- `get_my_role()` - Get your role
- `update_user_role()` - Admin-only role changes
- Prevent infinite recursion

## Summary

1. **Sign In**: User → Google → Supabase → Callback
2. **Profile Created**: Trigger automatically creates profile
3. **Role Check**: Middleware checks role on every request
4. **Route Protection**: Students ≠ Teachers ≠ Admins
5. **Data Security**: RLS ensures users only see their own data
