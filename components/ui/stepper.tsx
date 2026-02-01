'use client'

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
    id: string
    title: string
    number: number
}

interface StepperProps {
    steps: Step[]
    currentStep: string
    className?: string
}

/**
 * Stepper - Visual progress indicator for multi-step wizards
 * 
 * Swiss-style design: minimal, clean lines, bold typography
 */
export function Stepper({ steps, currentStep, className }: StepperProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep)

    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            {steps.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = index < currentIndex
                const isLast = index === steps.length - 1

                return (
                    <div key={step.id} className="flex items-center">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2">
                            {/* Number/Check circle */}
                            <div
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center text-sm font-bold transition-all duration-200",
                                    isCompleted && "bg-primary text-primary-foreground",
                                    isActive && "bg-foreground text-background",
                                    !isActive && !isCompleted && "bg-muted text-muted-foreground border-2 border-border"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    step.number
                                )}
                            </div>

                            {/* Step title */}
                            <span
                                className={cn(
                                    "text-xs font-bold uppercase tracking-wider hidden sm:inline transition-colors duration-200",
                                    isActive && "text-foreground",
                                    isCompleted && "text-primary",
                                    !isActive && !isCompleted && "text-muted-foreground"
                                )}
                            >
                                {step.title}
                            </span>
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                            <div
                                className={cn(
                                    "w-8 md:w-16 h-0.5 mx-2 transition-colors duration-300",
                                    index < currentIndex ? "bg-primary" : "bg-border/50"
                                )}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/**
 * Compact stepper for mobile - just shows current step
 */
export function StepperCompact({
    steps,
    currentStep,
    className
}: StepperProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    const current = steps[currentIndex]

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Step {current?.number} of {steps.length}
            </span>
            <span className="text-sm font-bold text-foreground">
                {current?.title}
            </span>
        </div>
    )
}
