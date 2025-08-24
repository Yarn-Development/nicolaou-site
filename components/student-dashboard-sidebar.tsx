"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  MessageSquare,
  Calendar,
  Award,
  Settings,
  Brain
} from "lucide-react"

export function StudentSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const studentNavItems = [
    {
      title: "Dashboard",
      href: "/student-dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "My Assignments",
      href: "/student-dashboard/assignments",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Practice",
      href: "/student-dashboard/practice",
      icon: <Brain className="h-5 w-5" />,
    },
    {
      title: "Progress",
      href: "/student-dashboard/progress",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Calendar",
      href: "/student-dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Achievements",
      href: "/student-dashboard/achievements",
      icon: <Award className="h-5 w-5" />,
    },
    {
      title: "Help",
      href: "/student-dashboard/help",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/student-dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <div className={cn(
      "flex h-full flex-col glassmorphic border-r border-muted/30 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/student-dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <span className="text-sm font-bold text-primary">N</span>
            </div>
            <span className="font-bold">Nicolaou Maths</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <nav className="flex-1 space-y-1 p-2">
        {studentNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                collapsed && "justify-center px-2"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.title}</span>}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  )
}

function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  )
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}