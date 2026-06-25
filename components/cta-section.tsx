"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-32 bg-swiss-ink text-swiss-paper border-t-4 border-swiss-signal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-8 items-end">
          {/* Main heading */}
          <div className="col-span-12 lg:col-span-7">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-swiss-paper">
              Built for serious<br />
              maths teaching.
            </h2>
          </div>

          {/* Description + CTA */}
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-end pb-2">
            <p className="text-lg leading-relaxed font-medium text-white/75 mb-8">
              Nicolaou{"'"}s Maths is used by secondary school maths teachers to manage the full cycle — from question ingestion to student feedback.
            </p>

            <div className="flex flex-col gap-3 max-w-xs">
              <Button
                asChild
                className="bg-swiss-signal text-white hover:bg-white hover:text-swiss-ink font-bold uppercase tracking-wider text-sm px-8 py-6 transition-colors duration-200"
              >
                <Link href="/sign-in">Sign In →</Link>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="col-span-12">
            <div className="w-full h-px bg-swiss-paper/20 mt-8 mb-8" />
          </div>

          {/* Bottom feature callouts — real capabilities */}
          <div className="col-span-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-swiss-paper/20">
              {[
                ["Edexcel / AQA / OCR", "Full multi-board support"],
                ["GCSE + A Level", "Foundation, Higher, new spec, legacy modular"],
                ["AI-Powered", "Claude AI for question generation & feedback"],
                ["School SSO", "Google Workspace & Microsoft Azure AD"],
              ].map(([title, sub]) => (
                <div key={title} className="border-r border-swiss-paper/20 pt-8 pr-8 last:border-r-0">
                  <div className="text-sm font-black uppercase tracking-wide text-swiss-paper mb-1">{title}</div>
                  <div className="text-xs text-white/50 leading-relaxed">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
