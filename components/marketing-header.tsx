"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-swiss-paper border-b border-swiss-ink">
      <div className="container flex h-16 items-center justify-between mx-auto px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tighter text-swiss-ink">
              NICOLAOU_
            </span>
          </Link>
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-swiss-concrete text-sm font-bold uppercase tracking-wider">
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-2 bg-swiss-paper border border-swiss-ink">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/"
                          className="flex h-full w-full select-none flex-col justify-end bg-swiss-concrete p-6 no-underline outline-none focus:bg-muted hover:border hover:border-swiss-ink"
                        >
                          <div className="mb-2 mt-4 text-lg font-bold text-swiss-signal uppercase tracking-wide">AI-Powered Learning</div>
                          <p className="text-sm leading-tight text-swiss-lead">
                            Personalized learning paths and adaptive assessments powered by artificial intelligence
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <ListItem href="/features/teachers" title="For Teachers">
                      Streamline your workflow with AI assistance
                    </ListItem>
                    <ListItem href="/features/students" title="For Students">
                      Personalized learning paths and instant feedback
                    </ListItem>
                    <ListItem href="/features/institutions" title="For Institutions">
                      Analytics and management tools for educational organizations
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/pricing" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center bg-transparent px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-swiss-concrete hover:text-foreground focus:bg-swiss-concrete focus:text-foreground focus:outline-none">
                    Pricing
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/blog" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center bg-transparent px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-swiss-concrete hover:text-foreground focus:bg-swiss-concrete focus:text-foreground focus:outline-none">
                    Blog
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hover:bg-swiss-concrete font-bold uppercase tracking-wider text-sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="bg-swiss-signal text-white hover:bg-swiss-ink font-bold uppercase tracking-wider text-sm px-8 py-4">
            <Link href="/signup">Sign up free</Link>
          </Button>
        </div>
        <button 
          className="md:hidden bg-swiss-paper border border-swiss-ink p-2 hover:bg-swiss-concrete transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-swiss-paper border-t border-swiss-ink p-4">
          <nav className="flex flex-col space-y-4">
            <div className="flex items-center justify-between px-4 py-2 bg-swiss-concrete border border-swiss-ink">
              <span className="text-sm font-bold uppercase tracking-wider">Theme</span>
              <ThemeToggle />
            </div>
            <Link
              href="/features"
              className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-swiss-concrete transition-colors border border-transparent hover:border-swiss-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-3 text-sm font-bold uppercase tracking-wider bg-swiss-signal text-white hover:bg-swiss-ink transition-colors text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign up free
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

const ListItem = React.forwardRef<React.ElementRef<"a">, React.ComponentPropsWithoutRef<"a">>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:border hover:border-swiss-ink",
              className,
            )}
            {...props}
          >
            <div className="text-sm font-bold leading-none uppercase tracking-wide">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-swiss-lead">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  },
)
ListItem.displayName = "ListItem"