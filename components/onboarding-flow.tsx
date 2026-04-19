"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, GraduationCap, BookOpen, Check, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { UserRole, RoleSource } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

interface OnboardingFlowProps {
  /** Role already assigned (from auto-detection or existing profile). Null if unknown. */
  initialRole: UserRole | null
  /** How the role was set. 'pending' means the user must choose. */
  roleSource: RoleSource
}

// =====================================================
// Step helpers
// =====================================================

/**
 * When role_source is 'auto_detected' we skip step 1 (Choose Role).
 * Steps are numbered from the user's perspective: 1-based display labels.
 */
function buildSteps(roleIsKnown: boolean) {
  if (roleIsKnown) {
    return ["Your Details", "Complete"] as const
  }
  return ["Choose Role", "Your Details", "Complete"] as const
}

// =====================================================
// Component
// =====================================================

export function OnboardingFlow({ initialRole, roleSource }: OnboardingFlowProps) {
  const router = useRouter()

  // Role is already known when auto-detected from email pattern
  const roleIsKnown = roleSource === 'auto_detected' && initialRole !== null

  const STEPS = buildSteps(roleIsKnown)

  const [step, setStep] = useState(1)
  const [role, setRole] = useState<string>(initialRole ?? "")
  const [name, setName] = useState("")
  const [institution, setInstitution] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Map internal step number to which logical step we're on
  // When roleIsKnown: step 1 = Details, step 2 = Complete
  // When !roleIsKnown: step 1 = Choose Role, step 2 = Details, step 3 = Complete
  const detailsStep = roleIsKnown ? 1 : 2
  const completeStep = roleIsKnown ? 2 : 3

  const saveProfile = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Not authenticated", { description: "Please sign in first" })
        router.push("/login")
        return
      }

      const updatePayload: Record<string, unknown> = {
        full_name: name,
        institution: institution || null,
        onboarding_completed: true,
      }

      // Only set role + role_source if it wasn't already auto-detected
      if (!roleIsKnown) {
        updatePayload.role = role as UserRole
        updatePayload.role_source = 'self_selected'
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)

      if (error) {
        console.error("Failed to update profile:", error)
        toast.error("Failed to save profile", { description: error.message })
        return
      }

      toast.success("Onboarding complete!", {
        description: "Redirecting to your dashboard...",
      })

      const effectiveRole = roleIsKnown ? initialRole : role
      const targetDashboard = effectiveRole === "teacher" ? "/dashboard" : "/student-dashboard"
      router.push(targetDashboard)
    } catch (error) {
      console.error("Onboarding error:", error)
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    const isLastStep = step === STEPS.length
    if (isLastStep) {
      saveProfile()
      return
    }
    // Validation per step
    if (!roleIsKnown && step === 1 && !role) return  // must pick role
    if (step === detailsStep && !name) return         // must enter name
    setStep(s => s + 1)
  }

  const prevStep = () => setStep(s => s - 1)

  const effectiveRole = roleIsKnown ? initialRole : role

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const stepNum = i + 1
            const isCompleted = stepNum < step
            const isCurrent = stepNum === step

            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`size-8 flex items-center justify-center border-2 text-sm font-black ${
                      isCompleted
                        ? "bg-swiss-ink text-swiss-paper border-swiss-ink"
                        : isCurrent
                          ? "border-swiss-ink text-swiss-ink"
                          : "border-swiss-ink/20 text-swiss-ink/30"
                    }`}
                  >
                    {isCompleted ? <Check className="size-4" /> : stepNum}
                  </div>
                  <span
                    className={`mt-2 text-xs font-bold uppercase tracking-wider ${
                      isCompleted || isCurrent ? "text-swiss-ink" : "text-swiss-lead"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-3 mt-[-1.25rem] ${
                      isCompleted ? "bg-swiss-ink" : "bg-swiss-ink/10"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
        <AnimatePresence mode="wait">

          {/* ===== STEP: Choose Role (only shown when role is NOT auto-detected) ===== */}
          {!roleIsKnown && step === 1 && (
            <motion.div
              key="step-choose-role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-swiss-signal mb-2 block">
                  Step 1
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-balance">
                  Choose your role
                </h2>
                <p className="text-swiss-lead mt-1 text-pretty">
                  We&apos;ll personalise your experience based on how you&apos;ll use the platform
                </p>
              </div>

              <RadioGroup value={role} onValueChange={setRole} className="space-y-3">
                <div
                  className={`border-2 p-5 cursor-pointer transition-colors ${
                    role === "teacher"
                      ? "border-swiss-ink bg-swiss-concrete/50"
                      : "border-swiss-ink/20 hover:border-swiss-ink"
                  }`}
                  onClick={() => setRole("teacher")}
                >
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="teacher" id="teacher" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="teacher" className="text-base font-bold cursor-pointer flex items-center">
                        <BookOpen className="mr-2 size-5" />
                        Teacher / Educator
                      </Label>
                      <p className="text-sm text-swiss-lead">
                        Create exams, manage students, and track progress with AI assistance
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`border-2 p-5 cursor-pointer transition-colors ${
                    role === "student"
                      ? "border-swiss-ink bg-swiss-concrete/50"
                      : "border-swiss-ink/20 hover:border-swiss-ink"
                  }`}
                  onClick={() => setRole("student")}
                >
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="student" id="student" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="student" className="text-base font-bold cursor-pointer flex items-center">
                        <GraduationCap className="mr-2 size-5" />
                        Student / Learner
                      </Label>
                      <p className="text-sm text-swiss-lead">
                        Access revision lists, practise with past papers, and track your progress
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={nextStep}
                  disabled={!role}
                  className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase text-xs tracking-wider border-2 border-swiss-signal"
                >
                  Continue
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ===== STEP: Your Details ===== */}
          {step === detailsStep && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-swiss-signal mb-2 block">
                  Step {detailsStep}
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-balance">
                  Tell us about yourself
                </h2>
                <p className="text-swiss-lead mt-1 text-pretty">
                  This helps us tailor your dashboard experience
                </p>
              </div>

              {/* Auto-detected role notice */}
              {roleIsKnown && (
                <div className="border-l-4 border-swiss-signal bg-swiss-concrete/40 p-4 flex items-start gap-3">
                  <Zap className="size-4 text-swiss-signal flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-swiss-ink mb-0.5">
                      Role detected from your school email
                    </p>
                    <p className="text-xs text-swiss-lead font-medium">
                      You&apos;ve been set up as a{" "}
                      <span className="font-bold text-swiss-ink capitalize">{effectiveRole}</span>.
                      Contact your administrator if this is incorrect.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="border-2 border-swiss-ink/20 focus:border-swiss-ink font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-xs font-bold uppercase tracking-wider">
                    School / Institution
                    <span className="text-swiss-lead font-normal ml-2 normal-case tracking-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder={effectiveRole === "teacher" ? "Where you teach" : "Where you study"}
                    className="border-2 border-swiss-ink/20 focus:border-swiss-ink font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
                  >
                    <ChevronLeft className="mr-2 size-4" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  disabled={!name}
                  className="ml-auto bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase text-xs tracking-wider border-2 border-swiss-signal"
                >
                  Continue
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ===== STEP: Complete ===== */}
          {step === completeStep && (
            <motion.div
              key="step-complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="size-16 flex items-center justify-center bg-swiss-ink text-swiss-paper">
                    <Check className="size-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-balance">
                  You&apos;re all set
                </h2>
                <p className="text-swiss-lead mt-1">
                  Your dashboard is ready to explore
                </p>
              </div>

              {/* Profile summary */}
              <div className="border-2 border-swiss-ink divide-y divide-swiss-ink/20">
                <div className="px-5 py-3 bg-swiss-concrete/50">
                  <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    Your Profile
                  </span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Role</span>
                  <span className="font-bold capitalize">{effectiveRole}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Name</span>
                  <span className="font-bold">{name}</span>
                </div>
                {institution && (
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Institution</span>
                    <span className="font-bold">{institution}</span>
                  </div>
                )}
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Subject</span>
                  <span className="font-bold">Mathematics</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
                >
                  <ChevronLeft className="mr-2 size-4" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={isSubmitting}
                  className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase text-xs tracking-wider border-2 border-swiss-signal"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Go to Dashboard"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
