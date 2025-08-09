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
    <header className="sticky top-0 z-50 w-full glassmorphic border-b border-border/50">
      <div className="container flex h-16 items-center justify-between mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-[#00BFFF] via-[#A259FF] to-[#00FFC6] text-transparent bg-clip-text">
              Nicolaou&#39;s Maths
            </span>
          </Link>
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 transition-all duration-300">
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/"
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/10 to-secondary/10 p-6 no-underline outline-none focus:shadow-md hover:glow-border transition-all duration-300"
                        >
                          <div className="mb-2 mt-4 text-lg font-medium text-primary">AI-Powered Learning</div>
                          <p className="text-sm leading-tight text-muted-foreground">
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
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 hover:text-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    Pricing
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/blog" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 hover:text-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    Blog
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hover:bg-muted/50">
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 glow-border shadow-lg">
            <Link href="/signup">Sign up free</Link>
          </Button>
        </div>
        <button className="md:hidden glassmorphic p-2 rounded-md hover:glow-border transition-all duration-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden glassmorphic border-t border-border/50 p-4">
          <nav className="flex flex-col space-y-4">
            <div className="flex items-center justify-between px-4 py-2 glassmorphic rounded-md">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>
            {/* Mobile navigation links with enhanced styling */}
            <Link
              href="/features"
              className="px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-all duration-300 hover:glow-border"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-all duration-300 hover:glow-border"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-all duration-300 hover:glow-border"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="px-4 py-3 text-sm font-medium rounded-md hover:bg-muted/50 transition-all duration-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-3 text-sm font-medium bg-gradient-to-r from-primary to-secondary text-white rounded-md hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 glow-border text-center"
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
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground hover:glow-border",
              className,
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  },
)
ListItem.displayName = "ListItem"