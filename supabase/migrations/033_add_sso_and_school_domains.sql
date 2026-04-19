-- =====================================================
-- Migration 030: SSO Support & School Domains
-- =====================================================
-- Adds:
--   1. school_domains table - configures allowed email domains per school,
--      with optional teacher email pattern for auto role detection
--   2. role_source column on profiles - tracks how a user's role was assigned

-- =====================================================
-- 1. school_domains table
-- =====================================================

CREATE TABLE public.school_domains (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT        UNIQUE NOT NULL,           -- e.g. 'nicolaouschool.org.uk'
  school_name     TEXT        NOT NULL,
  teacher_email_pattern TEXT  DEFAULT NULL,              -- JS-compatible regex, e.g. '^t\.' or '^staff-'
  sso_provider    TEXT        NOT NULL DEFAULT 'both',   -- 'google' | 'azure' | 'both'
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.school_domains.teacher_email_pattern IS
  'A JavaScript-compatible regex tested against the local part (before @) of the email.
   If the local part matches this pattern the user is auto-assigned the teacher role.
   Leave NULL to fall back to the post-login role-selection prompt.
   Examples: "^t\." matches t.surname@school.edu; "^staff-" matches staff-jones@school.edu';

COMMENT ON COLUMN public.school_domains.sso_provider IS
  'Which OAuth providers are accepted for this domain: google | azure | both';

-- RLS
ALTER TABLE public.school_domains ENABLE ROW LEVEL SECURITY;

-- Active domains are readable by anyone (including the anon key used during auth callback)
CREATE POLICY "Anyone can read active school domains"
  ON public.school_domains
  FOR SELECT
  USING (is_active = true);

-- Only admins can create/update/delete domain configurations
CREATE POLICY "Admins can manage school domains"
  ON public.school_domains
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2. role_source on profiles
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_source TEXT NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN public.profiles.role_source IS
  'How this user''s role was assigned:
   pending       — not yet determined (onboarding will prompt)
   auto_detected — matched against school domain teacher_email_pattern
   self_selected — user chose during onboarding
   admin_assigned — manually set by an admin';

-- Backfill: existing users who completed onboarding were self-selected
UPDATE public.profiles
  SET role_source = 'self_selected'
  WHERE onboarding_completed = true AND role_source = 'pending';

-- =====================================================
-- 3. Seed: add your school domain(s) here
-- =====================================================
-- Insert example rows — update domain/school_name/teacher_email_pattern
-- to match the real school before deploying.
--
-- Example: teacher emails look like t.smith@school.edu
-- INSERT INTO public.school_domains (domain, school_name, teacher_email_pattern, sso_provider)
-- VALUES ('school.edu', 'Example School', '^t\.', 'google');
--
-- For testing with a Microsoft personal/work account, add your domain:
-- INSERT INTO public.school_domains (domain, school_name, sso_provider)
-- VALUES ('yourdomain.com', 'Test Organisation', 'azure');
