"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Bell, Search, User, LogOut, Sparkles, Database, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function DashboardHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-swiss-paper border-b-2 border-swiss-ink print:hidden">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden md:flex">
            <span className="text-2xl font-black tracking-tighter text-swiss-ink">
              NICOLAOU_
            </span>
          </Link>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          {/* Quick Actions - Question Tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost"
                className="hidden md:flex items-center gap-2 hover:bg-swiss-concrete border-2 border-swiss-ink font-bold uppercase tracking-wider text-xs"
              >
                <Plus className="h-4 w-4" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-swiss-paper border-2 border-swiss-ink min-w-[240px] p-2">
              <DropdownMenuLabel className="font-black uppercase tracking-wider text-xs text-swiss-signal">
                Question Tools
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-swiss-ink my-2" />
              <Link href="/dashboard/questions">
                <DropdownMenuItem className="font-bold text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-swiss-signal" />
                    <div>
                      <p className="font-bold mb-0.5">Create Question</p>
                      <p className="text-swiss-lead text-[10px] font-medium">AI Generator & OCR</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </Link>
              <Link href="/dashboard/questions/browse">
                <DropdownMenuItem className="font-bold text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-swiss-signal" />
                    <div>
                      <p className="font-bold mb-0.5">Question Bank</p>
                      <p className="text-swiss-lead text-[10px] font-medium">Browse & Manage</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          {searchOpen ? (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-swiss-lead" />
              <Input
                type="search"
                placeholder="SEARCH..."
                className="w-full bg-swiss-concrete pl-10 border-2 border-swiss-ink font-bold uppercase tracking-wider text-xs placeholder:text-swiss-lead focus:border-swiss-signal"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSearchOpen(true)}
              className="hover:bg-swiss-concrete border-2 border-swiss-ink"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-swiss-concrete border-2 border-swiss-ink"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-swiss-signal text-[10px] font-black text-white border border-swiss-ink">
                  3
                </span>
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-swiss-paper border-2 border-swiss-ink min-w-[280px] p-2">
              <DropdownMenuLabel className="font-black uppercase tracking-wider text-xs text-swiss-signal">
                Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-swiss-ink my-2" />
              <DropdownMenuItem className="font-bold text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-swiss-signal mt-1.5"></div>
                  <div>
                    <p className="font-bold mb-1">New assignment submitted</p>
                    <p className="text-swiss-lead text-[10px] font-medium">2 minutes ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="font-bold text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-swiss-signal mt-1.5"></div>
                  <div>
                    <p className="font-bold mb-1">Feedback received</p>
                    <p className="text-swiss-lead text-[10px] font-medium">1 hour ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="font-bold text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-swiss-ink mt-1.5"></div>
                  <div>
                    <p className="font-bold mb-1">System update completed</p>
                    <p className="text-swiss-lead text-[10px] font-medium">3 hours ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-swiss-concrete border-2 border-swiss-ink"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-swiss-paper border-2 border-swiss-ink min-w-[180px] p-2">
              <DropdownMenuLabel className="font-black uppercase tracking-wider text-xs text-swiss-signal">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-swiss-ink my-2" />
              <DropdownMenuItem className="font-bold uppercase tracking-wider text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="font-bold uppercase tracking-wider text-xs py-3 hover:bg-swiss-concrete cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-swiss-ink my-2" />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="font-bold uppercase tracking-wider text-xs py-3 hover:bg-swiss-signal hover:text-white cursor-pointer flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
