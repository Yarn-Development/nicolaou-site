"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, GraduationCap, BookOpen, Check } from "lucide-react"
import { toast } from "sonner"

export function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState("")
  const [subjects, setSubjects] = useState<string[]>([])
  const [name, setName] = useState("")
  const [institution, setInstitution] = useState("")

  const nextStep = () => {
    if (step === 1 && role) {
      setStep(2)
      toast(`Selected role: ${role}`, {
        description: "Your experience will be tailored to this role",
      })
    } else if (step === 2) {
      setStep(3)
      toast.success("Profile information saved", {
        description: "Your preferences have been recorded",
      })
    } else if (step === 3) {
      toast.success("Onboarding complete!", {
        description: "Redirecting to your personalized dashboard",
        action: {
          label: "Go to Dashboard",
          onClick: () => (window.location.href = "/dashboard"),
        },
      })
    }
  }

  const prevStep = () => setStep(step - 1)

  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter((s) => s !== subject))
    } else {
      setSubjects([...subjects, subject])
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center ${i < step ? "text-primary" : i === step ? "text-foreground" : "text-muted-foreground"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary"
                      : "border-2 border-muted"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i}
              </div>
              {i < 3 && <div className={`h-1 w-16 md:w-32 ${i < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>Choose Role</span>
          <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>Personalize</span>
          <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>Complete</span>
        </div>
      </div>

      <div className="glassmorphic rounded-xl p-8 shadow-xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Choose your role</h2>
                <p className="text-muted-foreground">
                  We'll personalize your experience based on how you'll use Nicolaou's Maths
                </p>
              </div>

              <RadioGroup value={role} onValueChange={setRole} className="space-y-4">
                <div
                  className={`glassmorphic rounded-lg p-4 cursor-pointer transition-all ${
                    role === "teacher" ? "glow-border-violet" : "border border-muted/30"
                  }`}
                  onClick={() => setRole("teacher")}
                >
                  <div className="flex items-start space-x-4">
                    <RadioGroupItem value="teacher" id="teacher" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="teacher" className="text-lg font-medium cursor-pointer flex items-center">
                        <BookOpen className="mr-2 h-5 w-5 text-secondary" />
                        Teacher / Educator
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Create content, manage students, and track progress with AI assistance
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`glassmorphic rounded-lg p-4 cursor-pointer transition-all ${
                    role === "student" ? "glow-border-mint" : "border border-muted/30"
                  }`}
                  onClick={() => setRole("student")}
                >
                  <div className="flex items-start space-x-4">
                    <RadioGroupItem value="student" id="student" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="student" className="text-lg font-medium cursor-pointer flex items-center">
                        <GraduationCap className="mr-2 h-5 w-5 text-accent" />
                        Student / Learner
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Access personalized learning paths, practice with AI tutoring, and track your progress
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              <div className="pt-4 flex justify-end">
                <Button onClick={nextStep} disabled={!role} className="bg-primary hover:bg-primary/90">
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Personalize your experience</h2>
                <p className="text-muted-foreground">
                  Tell us a bit more about yourself so we can tailor your dashboard
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="glassmorphic border-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">School / Institution</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Where you teach or study"
                    className="glassmorphic border-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subjects of Interest</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Mathematics", "Science", "English", "History", "Computer Science", "Languages"].map(
                      (subject) => (
                        <div
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          className={`glassmorphic rounded-lg p-3 cursor-pointer text-center transition-all ${
                            subjects.includes(subject) ? "glow-border" : "border border-muted/30"
                          }`}
                        >
                          {subject}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={prevStep} className="border-muted/30">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!name || subjects.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">You're all set!</h2>
                <p className="text-muted-foreground">Your personalized dashboard is ready to explore</p>
              </div>

              <div className="glassmorphic rounded-lg p-4 border border-muted/30">
                <h3 className="font-medium mb-2">Your Profile</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium capitalize">{role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Institution:</span>
                    <span className="font-medium">{institution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subjects:</span>
                    <span className="font-medium">{subjects.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={prevStep} className="border-muted/30">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep} className="bg-primary hover:bg-primary/90 glow-border">
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
