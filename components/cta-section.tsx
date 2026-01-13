"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-32 bg-swiss-ink text-swiss-paper border-t-4 border-swiss-signal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-8">
          {/* Main CTA Text */}
          <div className="col-span-12 lg:col-span-8">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase mb-8 text-swiss-paper">
              READY TO<br />
              TRANSFORM<br />
              YOUR TEACHING?
            </h2>
          </div>

          {/* Right Column Info */}
          <div className="col-span-12 lg:col-span-4 flex flex-col justify-end">
            <div className="space-y-6">
              <p className="text-xl leading-relaxed font-medium text-swiss-paper">
                Join thousands of educators who are already using AI to create better learning experiences.
              </p>

              <div className="space-y-2 text-sm font-bold uppercase tracking-wider text-swiss-paper">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-swiss-signal mr-3"></div>
                  No credit card required
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-swiss-signal mr-3"></div>
                  14-day free trial
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-swiss-signal mr-3"></div>
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="col-span-12">
            <div className="w-full h-px bg-swiss-paper my-8"></div>
          </div>

          {/* Buttons */}
          <div className="col-span-12 md:col-span-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild
                className="bg-swiss-signal text-white hover:bg-white hover:text-swiss-ink dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200"
              >
                <Link href="/signup">Start Free Trial →</Link>
              </Button>

              <Button 
                asChild
                variant="outline"
                className="bg-transparent border-2 border-swiss-paper text-swiss-paper hover:bg-swiss-paper hover:text-swiss-ink dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200"
              >
                <Link href="/demo">Watch Demo</Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="col-span-12 md:col-span-4 flex items-end">
            <div className="text-right w-full">
              <div className="text-5xl font-black mb-2 text-swiss-paper">15,000+</div>
              <div className="text-sm font-bold uppercase tracking-wider opacity-75 text-swiss-paper">Active Teachers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
