"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart, FileText, LayoutDashboard, Settings, Users, ChevronLeft, ChevronRight, Database, ClipboardList, ClipboardCheck, PlusCircle, Upload, Menu, X } from "lucide-react"

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const teacherNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      number: "01"
    },
    {
      title: "Students",
      href: "/dashboard/students",
      icon: <Users className="h-5 w-5" />,
      number: "02"
    },
    {
      title: "Marking",
      href: "/dashboard/marking",
      icon: <ClipboardCheck className="h-5 w-5" />,
      number: "03"
    },
    {
      title: "Assignments",
      href: "/dashboard/assignments",
      icon: <ClipboardList className="h-5 w-5" />,
      number: "04"
    },
    {
      title: "New Assignment",
      href: "/dashboard/assignments/create",
      icon: <PlusCircle className="h-5 w-5" />,
      number: "05"
    },
    {
      title: "Question Bank",
      href: "/dashboard/questions/browse",
      icon: <Database className="h-5 w-5" />,
      number: "06"
    },
    {
      title: "Videos",
      href: "/dashboard/assessments",
      icon: <FileText className="h-5 w-5" />,
      number: "07"
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="h-5 w-5" />,
      number: "08"
    },
    {
      title: "Upload Paper",
      href: "/dashboard/assignments/external",
      icon: <Upload className="h-5 w-5" />,
      number: "09"
    },
  ]

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b-2 border-swiss-ink">
        <div className="flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-swiss-signal block mb-1">
                Portal
              </span>
              <span className="text-lg font-black tracking-tight">Teacher</span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto hover:bg-swiss-concrete border border-swiss-ink"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="ml-auto hover:bg-swiss-concrete"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {teacherNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-2 transition-colors font-bold uppercase tracking-wider text-xs relative group",
                isActive
                  ? "bg-swiss-signal text-white border-swiss-signal"
                  : "border-swiss-ink hover:bg-swiss-concrete",
              )}
            >
              {/* Module Number (visible when not collapsed) */}
              {(!collapsed || isMobile) && (
                <span className={cn(
                  "text-xs font-black opacity-50 min-w-[24px]",
                  isActive ? "text-white" : "text-swiss-lead"
                )}>
                  {item.number}
                </span>
              )}
              {/* Icon */}
              <span className={collapsed && !isMobile ? "mx-auto" : ""}>
                {item.icon}
              </span>
              {/* Title */}
              {(!collapsed || isMobile) && <span className="flex-1">{item.title}</span>}
              {/* Active Indicator */}
              {isActive && (!collapsed || isMobile) && (
                <span className="w-2 h-2 bg-white"></span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Settings (Footer) */}
      <div className="p-4 border-t-2 border-swiss-ink">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-2 transition-colors font-bold uppercase tracking-wider text-xs",
            pathname === "/dashboard/settings"
              ? "bg-swiss-ink text-swiss-paper border-swiss-ink"
              : "border-swiss-ink hover:bg-swiss-concrete",
          )}
        >
          <span className={collapsed && !isMobile ? "mx-auto" : ""}>
            <Settings className="h-5 w-5" />
          </span>
          {(!collapsed || isMobile) && <span className="flex-1">Settings</span>}
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button - visible only on small screens */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden border-2 border-swiss-ink bg-background shadow-md"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-[280px] bg-swiss-paper z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile={true} />
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "bg-swiss-paper border-r-2 border-swiss-ink h-[calc(100vh-4rem)] transition-all duration-300 print:hidden hidden md:block",
          collapsed ? "w-[80px]" : "w-[280px]",
        )}
      >
        <SidebarContent isMobile={false} />
      </div>
    </>
  )
}
