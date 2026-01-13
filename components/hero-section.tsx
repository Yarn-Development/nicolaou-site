"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function HeroSection() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])
  return (
    <section className="bg-swiss-signal text-white px-6 py-32 border-b-4 border-swiss-ink">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Main Heading (Asymmetric Layout) */}
          <div className="col-span-12 lg:col-span-10">
            <h1 className="text-7xl md:text-9xl font-black leading-[0.85] tracking-tighter uppercase mb-12">
              MASTER<br />
              GCSE<br />
              MATHS
            </h1>
          </div>

          {/* Right Column - Indicator */}
          <div className="col-span-12 lg:col-span-2 flex items-end">
            <div className="w-full">
              <div className="h-4 bg-white dark:bg-white mb-4 w-full"></div>
              <p className="font-bold text-sm uppercase tracking-wider">Online • 2026</p>
            </div>
          </div>

          {/* Description - Offset Grid */}
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest mb-4">
              Module 01
            </span>
          </div>

          <div className="col-span-12 md:col-span-9 lg:col-span-7">
            <p className="text-xl leading-relaxed mb-8 font-medium">
              Create personalized worksheets, track student progress, and deliver adaptive assessments—all powered by AI that understands how students learn best.
            </p>

            {/* Show different CTAs based on auth state */}
            {user ? (
              <div className="flex flex-col gap-4 mb-12">
                <p className="text-sm font-bold uppercase tracking-widest opacity-90">
                  Welcome back, {user.email}
                </p>
                <Button 
                  asChild
                  className="bg-white text-swiss-signal dark:bg-white dark:text-signal hover:bg-swiss-ink hover:text-white dark:hover:bg-black dark:hover:text-white font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200 w-full sm:w-auto"
                >
                  <Link href="/dashboard">Go to Dashboard →</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mb-12 max-w-md">
                <GoogleSignInButton />
                
                <Button 
                  asChild
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-swiss-signal dark:hover:bg-white dark:hover:text-signal font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200"
                >
                  <Link href="#features">Learn More →</Link>
                </Button>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 border-t-2 border-white pt-8 mt-8">
              <div>
                <div className="text-4xl font-black mb-2">15K+</div>
                <div className="text-sm font-bold uppercase tracking-wider opacity-90">Students</div>
              </div>
              <div>
                <div className="text-4xl font-black mb-2">98%</div>
                <div className="text-sm font-bold uppercase tracking-wider opacity-90">Pass Rate</div>
              </div>
              <div>
                <div className="text-4xl font-black mb-2">24/7</div>
                <div className="text-sm font-bold uppercase tracking-wider opacity-90">AI Tutor</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
