import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { getCurrentUser } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Shield, Zap, Target } from "lucide-react"

export default async function LoginPage() {
  // If already logged in, redirect to appropriate dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

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
                Personalized worksheets and adaptive assessments that understand how you learn best.
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
                Enterprise-grade security with Google authentication. Your data is always protected.
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
                Access your learning portal
              </p>
            </div>

            {/* Google Sign In Button */}
            <div className="mb-6">
              <GoogleSignInButton />
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-swiss-ink/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-swiss-paper px-4 text-xs font-black uppercase tracking-widest text-swiss-lead">
                  SECURE LOGIN
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="border-l-4 border-swiss-signal bg-swiss-concrete dark:bg-swiss-ink/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink mb-2">
                ✓ NO PASSWORD REQUIRED
              </p>
              <p className="text-xs text-swiss-lead font-medium">
                Sign in securely with your Google account. No passwords to remember.
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
                New accounts start as students. Contact your administrator to upgrade your role.
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
