"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, GraduationCap, BookOpen, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { UserRole, RoleSource } from "@/lib/types/database"
import { acceptPendingInvites } from "@/app/actions/class-invites"
import { completeOnboarding } from "@/app/actions/onboarding"

// =====================================================
// Types
// =====================================================

interface OnboardingFlowProps {
  /** Role already assigned (from auto-detection or existing profile). Null if unknown. */
  initialRole: UserRole | null
  /** How the role was set. 'pending' means the user must choose. */
  roleSource: RoleSource
  prefillEmail?: string | null
  prefillName?: string | null
}

// Shared easing — matches the `swiss-fade-in` keyframe in globals.css.
const EASE = [0.16, 1, 0.3, 1] as const

// =====================================================
// Step helpers
// =====================================================

/**
 * When role_source is 'auto_detected' we skip step 1 (Choose Role).
 * Steps are numbered from the user's perspective: 1-based display labels.
 */
function buildSteps(roleIsKnown: boolean) {
  if (roleIsKnown) {
    return ["Your details", "Confirm"] as const
  }
  return ["Choose role", "Your details", "Confirm"] as const
}

// =====================================================
// Component
// =====================================================

export function OnboardingFlow({ initialRole, roleSource, prefillName }: OnboardingFlowProps) {
  const router = useRouter()

  // Role is already known when auto-detected from email pattern
  const roleIsKnown = roleSource === "auto_detected" && initialRole !== null

  const STEPS = buildSteps(roleIsKnown)

  const [step, setStep] = useState(1)
  const [role, setRole] = useState<string>(initialRole ?? "")
  const [name, setName] = useState(prefillName ?? "")
  const [institution, setInstitution] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // When roleIsKnown: step 1 = Details, step 2 = Confirm
  // When !roleIsKnown: step 1 = Choose Role, step 2 = Details, step 3 = Confirm
  const detailsStep = roleIsKnown ? 1 : 2
  const completeStep = roleIsKnown ? 2 : 3

  const saveProfile = async () => {
    setIsSubmitting(true)
    try {
      const effectiveRole = (roleIsKnown ? initialRole : role) as "teacher" | "student"
      const result = await completeOnboarding({
        role: effectiveRole,
        fullName: name,
        institution: institution || undefined,
      })

      if (!result.success) {
        toast.error("Failed to save profile", { description: result.error })
        return
      }

      toast.success("Onboarding complete", {
        description: "Taking you to your dashboard…",
      })

      // Auto-enroll students from any pending CSV invites
      if (effectiveRole === "student") {
        await acceptPendingInvites()
      }

      router.push(result.redirectTo ?? (effectiveRole === "teacher" ? "/dashboard" : "/student-dashboard"))
    } catch {
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
    if (!roleIsKnown && step === 1 && !role) return // must pick role
    if (step === detailsStep && !name) return // must enter name
    setStep((s) => s + 1)
  }

  const prevStep = () => setStep((s) => s - 1)

  const effectiveRole = roleIsKnown ? initialRole : role

  // Step-aware copy for the brand rail.
  const railCopy =
    step === completeStep
      ? { kicker: "Almost there", headline: "Everything's in place." }
      : step === detailsStep
        ? { kicker: "About you", headline: "Tell us who you are." }
        : { kicker: "Get started", headline: "Set up your space." }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ───────────────── Brand rail (Swiss, signal red) ───────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-swiss-signal p-10 text-white lg:flex xl:p-14">
        {/* Oversized step-number motif */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-4 select-none font-[family-name:'Bricolage_Grotesque'] text-[16rem] font-black leading-none text-white/10"
        >
          {String(step).padStart(2, "0")}
        </span>

        <div className="relative flex items-center justify-between">
          <span className="font-[family-name:'Bricolage_Grotesque'] text-2xl font-extrabold tracking-tighter">
            NICOLAOU_
          </span>
          <span className="swiss-label text-white/70">Account setup</span>
        </div>

        <div className="relative">
          <span className="swiss-label mb-4 block text-white/70">{railCopy.kicker}</span>
          <h1 className="swiss-heading-lg max-w-[12ch] text-white">{railCopy.headline}</h1>

          {/* Vertical step index — this is the progress indicator */}
          <ol className="mt-10 space-y-1">
            {STEPS.map((label, i) => {
              const stepNum = i + 1
              const isDone = stepNum < step
              const isCurrent = stepNum === step
              return (
                <li
                  key={label}
                  className={`flex items-center gap-4 border-t-2 py-3 transition-colors ${
                    isCurrent ? "border-white" : "border-white/25"
                  }`}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center text-xs font-black ${
                      isDone
                        ? "bg-white text-swiss-signal"
                        : isCurrent
                          ? "bg-white text-swiss-signal"
                          : "border-2 border-white/40 text-white/50"
                    }`}
                  >
                    {isDone ? <Check className="size-3.5" strokeWidth={3} /> : stepNum}
                  </span>
                  <span
                    className={`swiss-label ${isCurrent ? "text-white" : isDone ? "text-white/80" : "text-white/45"}`}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="relative max-w-[28ch] text-sm font-medium leading-relaxed text-white/80">
          AI-enhanced GCSE maths — personalised worksheets, adaptive assessments, real progress.
        </p>
      </aside>

      {/* ───────────────── Step content (paper) ───────────────── */}
      <main className="flex flex-col bg-swiss-paper">
        {/* Mobile brand bar */}
        <div className="flex items-center justify-between border-b-2 border-swiss-ink px-6 py-4 lg:hidden">
          <span className="font-[family-name:'Bricolage_Grotesque'] text-xl font-extrabold tracking-tighter text-swiss-signal">
            NICOLAOU_
          </span>
          <span className="swiss-label text-swiss-lead">
            Step {step} / {STEPS.length}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {/* ===== STEP: Choose Role ===== */}
              {!roleIsKnown && step === 1 && (
                <motion.div
                  key="step-choose-role"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <span className="swiss-module-label">Step 01</span>
                  <h2 className="swiss-heading-md mt-3 text-swiss-ink">How will you use Nicolaou?</h2>
                  <p className="swiss-body mt-2 max-w-[46ch] text-swiss-lead">
                    We&apos;ll tailor your workspace to the way you work.
                  </p>

                  <div className="mt-8 space-y-3">
                    <RoleOption
                      selected={role === "teacher"}
                      onSelect={() => setRole("teacher")}
                      icon={<BookOpen className="size-5" strokeWidth={2} />}
                      title="Teacher / Educator"
                      description="Create exams, manage classes, and track progress with AI assistance."
                    />
                    <RoleOption
                      selected={role === "student"}
                      onSelect={() => setRole("student")}
                      icon={<GraduationCap className="size-5" strokeWidth={2} />}
                      title="Student / Learner"
                      description="Practise with past papers, work through revision lists, and watch your progress."
                    />
                  </div>

                  <div className="mt-10 flex justify-end">
                    <PrimaryButton onClick={nextStep} disabled={!role}>
                      Continue <ArrowRight className="size-4" strokeWidth={2.5} />
                    </PrimaryButton>
                  </div>
                </motion.div>
              )}

              {/* ===== STEP: Your Details ===== */}
              {step === detailsStep && (
                <motion.div
                  key="step-details"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <span className="swiss-module-label">Step {String(detailsStep).padStart(2, "0")}</span>
                  <h2 className="swiss-heading-md mt-3 text-swiss-ink">A few details</h2>
                  <p className="swiss-body mt-2 max-w-[46ch] text-swiss-lead">
                    This helps us tailor your dashboard from day one.
                  </p>

                  {roleIsKnown && (
                    <div className="mt-6 flex items-start gap-3 border-2 border-swiss-ink bg-swiss-concrete p-4">
                      <span className="mt-0.5 size-3 shrink-0 bg-swiss-signal" aria-hidden />
                      <p className="text-sm leading-relaxed text-swiss-ink">
                        Detected from your school email — you&apos;re set up as a{" "}
                        <span className="font-bold capitalize">{effectiveRole}</span>. Contact your
                        administrator if that&apos;s wrong.
                      </p>
                    </div>
                  )}

                  <div className="mt-8 space-y-6">
                    <Field label="Full name" htmlFor="name">
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="h-12 rounded-none border-2 border-swiss-ink/25 bg-transparent px-4 font-medium text-swiss-ink focus-visible:border-swiss-ink focus-visible:ring-0"
                      />
                    </Field>

                    <Field
                      label="School / institution"
                      htmlFor="institution"
                      hint="Optional"
                    >
                      <Input
                        id="institution"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder={effectiveRole === "teacher" ? "Where you teach" : "Where you study"}
                        className="h-12 rounded-none border-2 border-swiss-ink/25 bg-transparent px-4 font-medium text-swiss-ink focus-visible:border-swiss-ink focus-visible:ring-0"
                      />
                    </Field>
                  </div>

                  <div className="mt-10 flex items-center justify-between">
                    {step > 1 ? (
                      <GhostButton onClick={prevStep}>
                        <ArrowLeft className="size-4" strokeWidth={2.5} /> Back
                      </GhostButton>
                    ) : (
                      <span />
                    )}
                    <PrimaryButton onClick={nextStep} disabled={!name}>
                      Continue <ArrowRight className="size-4" strokeWidth={2.5} />
                    </PrimaryButton>
                  </div>
                </motion.div>
              )}

              {/* ===== STEP: Confirm ===== */}
              {step === completeStep && (
                <motion.div
                  key="step-complete"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <span className="swiss-module-label">Step {String(completeStep).padStart(2, "0")}</span>
                  <h2 className="swiss-heading-md mt-3 text-swiss-ink">Confirm &amp; finish</h2>
                  <p className="swiss-body mt-2 max-w-[46ch] text-swiss-lead">
                    Here&apos;s your profile. You can change any of this later.
                  </p>

                  <dl className="mt-8 border-2 border-swiss-ink">
                    <SummaryRow label="Role" value={effectiveRole ?? ""} capitalize />
                    <SummaryRow label="Name" value={name} />
                    {institution && <SummaryRow label="Institution" value={institution} />}
                    <SummaryRow label="Subject" value="Mathematics" />
                  </dl>

                  <div className="mt-10 flex items-center justify-between">
                    <GhostButton onClick={prevStep} disabled={isSubmitting}>
                      <ArrowLeft className="size-4" strokeWidth={2.5} /> Back
                    </GhostButton>
                    <PrimaryButton onClick={nextStep} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          Enter dashboard <ArrowRight className="size-4" strokeWidth={2.5} />
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

// =====================================================
// Local presentational pieces — kept in-file, all Swiss tokens
// =====================================================

function RoleOption({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full items-start gap-4 border-2 p-5 text-left transition-colors ${
        selected
          ? "border-swiss-ink bg-swiss-concrete"
          : "border-swiss-ink/20 hover:border-swiss-ink"
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center transition-colors ${
          selected ? "bg-swiss-signal text-white" : "bg-swiss-concrete text-swiss-ink group-hover:bg-swiss-ink group-hover:text-swiss-paper"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-[family-name:'Bricolage_Grotesque'] text-lg font-bold text-swiss-ink">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-swiss-lead">{description}</span>
      </span>
      <span
        className={`mt-1 size-4 shrink-0 border-2 transition-colors ${
          selected ? "border-swiss-signal bg-swiss-signal" : "border-swiss-ink/30"
        }`}
        aria-hidden
      />
    </button>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="swiss-label flex items-center gap-2 text-swiss-ink">
        {label}
        {hint && <span className="font-normal normal-case tracking-normal text-swiss-lead">— {hint}</span>}
      </Label>
      {children}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-swiss-ink/15 px-5 py-3.5 last:border-b-0">
      <dt className="swiss-label text-swiss-lead">{label}</dt>
      <dd className={`font-[family-name:'Bricolage_Grotesque'] font-bold text-swiss-ink ${capitalize ? "capitalize" : ""}`}>
        {value}
      </dd>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="group h-12 gap-2 rounded-none border-2 border-swiss-signal bg-swiss-signal px-6 text-sm font-bold text-white transition-colors hover:border-swiss-ink hover:bg-swiss-ink disabled:opacity-40"
    >
      {children}
    </Button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      className="h-12 gap-2 rounded-none border-2 border-swiss-ink bg-transparent px-6 text-sm font-bold text-swiss-ink transition-colors hover:bg-swiss-ink hover:text-swiss-paper"
    >
      {children}
    </Button>
  )
}
