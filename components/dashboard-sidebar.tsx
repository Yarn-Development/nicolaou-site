"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart, BookOpen, FileText, LayoutDashboard, Settings, Sparkles, Users } from "lucide-react"

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const teacherNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Students",
      href: "/dashboard/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Scheme of Work",
      href: "/dashboard/scheme",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: "Topics",
      href: "/dashboard/topics",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Asssessments",
      href: "/dashboard/assessments",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="h-5 w-5" />,
    },
    {
      title: "AI Tools",
      href: "/dashboard/ai-tools",
      icon: <Sparkles className="h-5 w-5" />,
    },
  ]

  return (
    <div
      className={cn(
        "glassmorphic border-r border-muted/20 h-[calc(100vh-4rem)] p-4 transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[250px]",
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <span className="text-lg font-semibold">Teacher Portal</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="space-y-1.5">
          {teacherNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted/50",
                pathname === item.href ? "bg-muted/50 text-primary glow-border" : "text-muted-foreground",
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted/50",
              pathname === "/dashboard/settings" ? "bg-muted/50 text-primary glow-border" : "text-muted-foreground",
            )}
          >
            <Settings className="h-5 w-5" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>
    </div>
  )
}

function ChevronLeft(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
