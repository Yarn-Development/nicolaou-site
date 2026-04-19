import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { MicrosoftSignInButton } from "@/components/auth/microsoft-sign-in-button"
import { getCurrentUser } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Shield, Zap, Target, AlertTriangle } from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "Your email address is not from a registered school. Please sign in with your school email account.",
  auth_failed:
    "Authentication failed. Please try again.",
  invalid_email:
    "We could not read your email address from your account. Please try a different sign-in method.",
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // If already logged in, redirect to appropriate dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "An error occurred. Please try again.") : null

  return (
    <div className="min-h-screen bg-swiss-paper flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-swiss-signal p-12 flex-col justify-between border-r-4 border-swiss-ink">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter text-white mb-6">
            NICOLAOU_
          </h1>
          <p className="text-xl font-bold uppercase tracking-wider text-white/90">
            Master GCSE Maths
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-swiss-signal" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">
                AI-POWERED LEARNING
              </h3>
              <p className="text-sm text-white/80 font-medium">
                Personalised worksheets and adaptive assessments that understand how you learn best.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-swiss-signal" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">
                TRACK PROGRESS
              </h3>
              <p className="text-sm text-white/80 font-medium">
                Monitor student performance with real-time analytics and detailed insights.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-swiss-signal" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">
                SECURE & RELIABLE
              </h3>
              <p className="text-sm text-white/80 font-medium">
                School SSO — sign in with your existing Google Workspace or Microsoft account.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-white/20 pt-6">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-4xl font-black text-white mb-1">15K+</p>
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">STUDENTS</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white mb-1">98%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">PASS RATE</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white mb-1">24/7</p>
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">AI TUTOR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 text-center">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-swiss-signal mb-2">
              NICOLAOU_
            </h1>
            <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
              Master GCSE Maths
            </p>
          </div>

          {/* Login Box */}
          <div className="border-4 border-swiss-ink bg-swiss-paper p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black uppercase tracking-widest text-swiss-ink mb-3">
                SIGN IN
              </h2>
              <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                Use your school email account
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-6 border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Sign In Buttons */}
            <div className="space-y-3 mb-6">
              <GoogleSignInButton />
              <MicrosoftSignInButton />
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-swiss-ink/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-swiss-paper px-4 text-xs font-black uppercase tracking-widest text-swiss-lead">
                  SCHOOL SSO
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="border-l-4 border-swiss-signal bg-swiss-concrete dark:bg-swiss-ink/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink mb-2">
                ✓ USE YOUR SCHOOL ACCOUNT
              </p>
              <p className="text-xs text-swiss-lead font-medium">
                Sign in with your school-issued Google Workspace or Microsoft account.
                Personal email addresses are not accepted.
              </p>
            </div>

            {/* Role Info */}
            <div className="mt-6 pt-6 border-t-2 border-swiss-ink/10">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-3">
                YOUR ACCOUNT TYPE
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-swiss-signal"></div>
                  <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink">
                    STUDENT
                  </p>
                  <p className="text-xs text-swiss-lead">— Access assignments and track progress</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-swiss-ink"></div>
                  <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink">
                    TEACHER
                  </p>
                  <p className="text-xs text-swiss-lead">— Create exams and manage students</p>
                </div>
              </div>
              <p className="text-xs text-swiss-lead mt-4 font-medium">
                Your role is detected automatically from your email address, or you can select it during setup.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-wider text-swiss-lead hover:text-swiss-signal transition-colors duration-200"
            >
              ← BACK TO HOME
            </Link>
          </div>

          {/* Legal */}
          <div className="mt-6 text-center">
            <p className="text-xs text-swiss-lead font-medium">
              By signing in, you agree to our{" "}
              <button className="font-bold text-swiss-ink hover:text-swiss-signal underline">
                Terms of Service
              </button>{" "}
              and{" "}
              <button className="font-bold text-swiss-ink hover:text-swiss-signal underline">
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
