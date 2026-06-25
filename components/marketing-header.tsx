"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-swiss-paper border-b-2 border-swiss-ink">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-black tracking-tighter text-swiss-ink">
              NICOLAOU_
            </span>
          </Link>
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-xs font-bold uppercase tracking-[0.18em] text-swiss-lead hover:text-swiss-signal transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-xs font-bold uppercase tracking-[0.18em] text-swiss-lead hover:text-swiss-signal transition-colors"
            >
              How it works
            </Link>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Button
            asChild
            className="bg-swiss-signal text-white hover:bg-swiss-ink font-bold uppercase tracking-wider text-xs px-6 py-4"
          >
            <Link href="/sign-in">Sign In →</Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden bg-swiss-paper border border-swiss-ink p-2 hover:bg-swiss-concrete transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-swiss-paper border-t border-swiss-ink p-4">
          <nav className="flex flex-col space-y-2">
            <div className="flex items-center justify-between px-4 py-2 bg-swiss-concrete border border-swiss-ink">
              <span className="text-xs font-bold uppercase tracking-wider">Theme</span>
              <ThemeToggle />
            </div>
            <Link
              href="/#features"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-swiss-signal text-white hover:bg-swiss-ink transition-colors text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In →
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
