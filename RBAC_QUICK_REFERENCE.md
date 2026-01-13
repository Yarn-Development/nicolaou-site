# ✅ RBAC Setup Complete - Quick Reference

## 🎯 What You Have Now

A complete **Role-Based Access Control** system with:
- ✅ Google OAuth authentication
- ✅ Automatic profile creation
- ✅ Three user roles (student, teacher, admin)
- ✅ Role-based route protection
- ✅ Row Level Security
- ✅ Fixed infinite recursion errors

---

## 🚀 Quick Start (5 Steps)

### 1. Run Database Migration
```
Supabase Dashboard → SQL Editor → New Query
→ Copy/paste: supabase/migrations/COMPLETE_SETUP.sql
→ Click "Run"
```

### 2. Set Up Google OAuth
```
Google Cloud Console → Create OAuth client
→ Copy Client ID & Secret
→ Supabase Dashboard → Authentication → Providers → Google
→ Paste credentials → Save
```

### 3. Add Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Start Dev Server
```bash
npm run dev
```

### 5. Test Sign-In
```
http://localhost:3000
→ Click "Sign in with Google"
→ Authenticate
→ Auto-redirected to student dashboard
```

---

## 📋 Role Management

### Make Yourself Admin
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@gmail.com';
```

### Change Any User's Role
```sql
-- Make someone a teacher
UPDATE public.profiles 
SET role = 'teacher' 
WHERE email = 'teacher@example.com';

-- Make someone a student
UPDATE public.profiles 
SET role = 'student' 
WHERE email = 'student@example.com';
```

### View All Users and Roles
```sql
SELECT 
  email, 
  role, 
  full_name,
  created_at 
FROM public.profiles 
ORDER BY created_at DESC;
```

---

## 🔐 Access Control Matrix

| Role | `/student-dashboard` | `/dashboard` | `/exam-builder` | `/admin` |
|------|---------------------|--------------|----------------|----------|
| Student | ✅ | ❌ | ❌ | ❌ |
| Teacher | ❌ | ✅ | ✅ | ❌ |
| Admin | ❌ | ✅ | ✅ | ✅ |

**Automatic redirects:**
- Students always go to → `/student-dashboard`
- Teachers/Admins always go to → `/dashboard`
- Unauthenticated → `/` (homepage)

---

## 🛠️ Common Tasks

### Check Current Auth State
```typescript
// In client component
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log(user)
```

### Get Current User's Profile
```typescript
// In server component
import { getCurrentProfile } from '@/lib/auth/helpers'

const profile = await getCurrentProfile()
console.log(profile?.role) // 'student' | 'teacher' | 'admin'
```

### Require Authentication
```typescript
// In server component/action
import { requireAuth } from '@/lib/auth/helpers'

const user = await requireAuth() // Throws if not logged in
```

### Require Teacher Access
```typescript
// In server component/action
import { requireTeacher } from '@/lib/auth/helpers'

const user = await requireTeacher() // Throws if not teacher/admin
```

---

## 🐛 Troubleshooting

### ❌ "Infinite recursion detected in policy"
**Fix:** Run `supabase/migrations/COMPLETE_SETUP.sql`

### ❌ Profile not created on signup
**Check trigger:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
**Fix:** Run COMPLETE_SETUP.sql again

### ❌ Can't access dashboard after signing in
1. Check if profile exists:
```sql
SELECT * FROM public.profiles WHERE email = 'your@email.com';
```
2. Check role is correct
3. Sign out and back in
4. Clear browser cookies

### ❌ "redirect_uri_mismatch" from Google
**Fix:** Verify in Google Cloud Console:
```
Authorized redirect URIs:
https://your-project-id.supabase.co/auth/v1/callback
```
(No trailing slash!)

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/COMPLETE_SETUP.sql` | ✅ Main database setup |
| `lib/auth/helpers.ts` | Server-side auth utilities |
| `lib/supabase/client.ts` | Client component Supabase |
| `lib/supabase/server.ts` | Server component Supabase |
| `middleware.ts` | Route protection & RBAC |
| `app/auth/callback/route.ts` | OAuth callback handler |
| `components/auth/google-sign-in-button.tsx` | Sign-in button |

---

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| `SUPABASE_SETUP.md` | Complete setup walkthrough |
| `FIXING_RLS_ERROR.md` | Fix infinite recursion |
| `AUTH_FLOW.md` | Visual flow diagrams |
| `supabase/migrations/README.md` | Migration guide |

---

## 🧪 Testing Checklist

- [ ] Run COMPLETE_SETUP.sql in Supabase
- [ ] Configure Google OAuth
- [ ] Add environment variables
- [ ] Start dev server
- [ ] Sign in with Google
- [ ] Profile auto-created in database
- [ ] Redirected to student dashboard
- [ ] Update role to 'teacher' via SQL
- [ ] Sign out and back in
- [ ] Redirected to teacher dashboard
- [ ] Can access /exam-builder
- [ ] Cannot access /student-dashboard
- [ ] Update role to 'admin' via SQL
- [ ] Sign out and back in
- [ ] Can access all routes

---

## 🔒 Security Notes

### ✅ DO:
- Keep `.env.local` out of Git
- Use RLS for database security
- Validate roles on server-side
- Use `requireAuth()` helpers
- Update roles via SQL or SECURITY DEFINER functions

### ❌ DON'T:
- Expose service_role key to frontend
- Trust client-side role checks alone
- Allow users to change their own roles
- Store API keys in client code
- Skip RLS policies

---

## 🚀 Production Deployment

1. **Deploy to Vercel/Netlify**
2. **Update Google OAuth:**
   - Add production domain to JavaScript origins
   - Add production callback URL
3. **Set environment variables** in hosting platform
4. **Test thoroughly** before going live
5. **Monitor Supabase logs** for errors

---

## 💡 Pro Tips

1. **Development**: Use incognito mode to test different accounts
2. **Debugging**: Check Supabase Dashboard → Logs for errors
3. **Testing roles**: Create multiple Google accounts
4. **Performance**: User role is cached in session
5. **Admin panel**: Build UI to manage roles (coming soon!)

---

## 🎉 You're All Set!

Your RBAC system is production-ready with:
- Secure authentication
- Automatic profile management
- Role-based access control
- Clean, maintainable code

**Need help?** Check the detailed guides in the docs folder.

**Happy coding!** 🚀
