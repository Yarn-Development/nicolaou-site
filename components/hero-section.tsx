"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { MicrosoftSignInButton } from "@/components/auth/microsoft-sign-in-button"
import { useUser } from "@clerk/nextjs"

export function HeroSection() {
  const { user, isLoaded } = useUser()

  return (
    <section className="bg-swiss-ink text-swiss-paper border-b-4 border-swiss-signal overflow-hidden">
      {/* Top accent rule */}
      <div className="h-1 bg-swiss-signal w-full" />

      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid grid-cols-12 gap-8">

          {/* Label column */}
          <div className="col-span-12 md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-[0.25em] text-swiss-signal mb-2">
              Platform
            </span>
            <span className="block text-xs font-bold uppercase tracking-[0.25em] text-white/40">
              2026
            </span>
          </div>

          {/* Main heading */}
          <div className="col-span-12 md:col-span-10">
            <h1 className="text-6xl md:text-8xl lg:text-[96px] font-black leading-[0.88] tracking-tighter mb-10 text-swiss-paper">
              Maths<br />
              Teaching<br />
              <span className="text-swiss-signal">Reimagined.</span>
            </h1>

            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-7">
                <p className="text-lg md:text-xl leading-relaxed mb-8 text-white/80 font-medium">
                  A complete platform for GCSE and A Level Maths — build exam papers, manage assignments, deliver AI-powered feedback, and track every student&apos;s progress.
                </p>

                {isLoaded && user ? (
                  <div className="flex flex-col gap-3 max-w-sm">
                    <p className="text-sm font-bold uppercase tracking-widest text-white/60">
                      Welcome back
                    </p>
                    <p className="text-base font-bold text-swiss-paper">
                      {user.primaryEmailAddress?.emailAddress ?? user.firstName}
                    </p>
                    <Button
                      asChild
                      className="bg-swiss-signal text-white hover:bg-white hover:text-swiss-ink font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200 mt-2"
                    >
                      <Link href="/dashboard">Go to Dashboard →</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-w-sm">
                    <GoogleSignInButton />
                    <MicrosoftSignInButton />
                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold text-center pt-1">
                      School SSO — Google Workspace &amp; Microsoft Azure AD
                    </p>
                  </div>
                )}
              </div>

              {/* Key capabilities list */}
              <div className="col-span-12 md:col-span-5 flex items-start justify-end">
                <div className="space-y-0 w-full max-w-xs mt-2">
                  {[
                    "GCSE & A Level Question Bank",
                    "AI Paper & Question Generation",
                    "Edexcel / AQA / OCR / IB",
                    "Marking & Student Feedback",
                    "Parent Email Reports",
                    "Unused Question Booklets",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-3 py-2.5 border-b border-white/10">
                      <div className="w-2 h-2 bg-swiss-signal flex-shrink-0" />
                      <span className="text-sm font-bold text-white/70 uppercase tracking-wide">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
