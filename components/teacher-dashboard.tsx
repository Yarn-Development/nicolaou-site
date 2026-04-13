"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceChart, type PerformanceDataPoint } from "@/components/performance-chart"
import { RecentAssignments, type RecentAssignment } from "@/components/recent-assignments"
import { StudentList } from "@/components/student-list"
import { UpcomingTasks, type UpcomingTask } from "@/components/upcoming-tasks"
import { AIAssistant } from "@/components/ai-assistant"
import { FileText, Sparkles, Database, ClipboardList, AlertCircle, ArrowRight } from "lucide-react"
import { AssignmentList } from "@/components/assignment-list"
import Link from "next/link"
import type { DashboardData } from "@/app/actions/dashboard"
import { Badge } from "@/components/ui/badge"

interface TeacherDashboardProps {
  data: DashboardData
  isDemo: boolean
  performanceData: PerformanceDataPoint[]
  recentAssignments: RecentAssignment[]
  upcomingTasks: UpcomingTask[]
}

export function TeacherDashboard({ data, isDemo, performanceData, recentAssignments, upcomingTasks }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const { stats } = data

  return (
    <div className="space-y-8">
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-primary/5 border-2 border-primary p-4 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-primary">Demo data.</span>{" "}
            Create classes and add students to see real statistics.
          </p>
          <Badge variant="outline" className="ml-auto border-primary text-primary font-bold text-xs">
            DEMO
          </Badge>
        </div>
      )}

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-background border-2 border-border p-0 h-auto gap-0">
          {["overview", "questions", "students", "assignments"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="swiss-label px-5 py-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=inactive]:text-muted-foreground border-r border-border last:border-r-0"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats strip */}
          <div className="grid gap-0 grid-cols-2 lg:grid-cols-4 border-2 border-border">
            <div className="border-r border-border p-5">
              <p className="swiss-label text-muted-foreground mb-3">Students</p>
              <div className="text-4xl font-black font-display mb-1">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.studentChange > 0 ? `+${stats.studentChange}` : stats.studentChange} this month
              </p>
            </div>
            <div className="border-r border-border p-5">
              <p className="swiss-label text-muted-foreground mb-3">Classes</p>
              <div className="text-4xl font-black font-display mb-1">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">{stats.activeStudents} active</p>
            </div>
            <div className="border-r border-border p-5">
              <p className="swiss-label text-muted-foreground mb-3">Pending</p>
              <div className="text-4xl font-black font-display mb-1 text-primary">{stats.pendingAssignments}</div>
              <p className="text-xs text-muted-foreground">{stats.needsGrading} to mark</p>
            </div>
            <div className="p-5 bg-foreground text-background">
              <p className="swiss-label text-background/60 mb-3">Avg Score</p>
              <div className="text-4xl font-black font-display mb-1">{stats.averageScore}%</div>
              <p className="text-xs text-background/70">
                {stats.scoreChange >= 0 ? `+${stats.scoreChange}%` : `${stats.scoreChange}%`} vs last term
              </p>
            </div>
          </div>

          {/* Charts + sidebar */}
          <div className="grid gap-4 lg:grid-cols-7">
            <Card className="border-2 border-border lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Performance</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceChart data={performanceData} />
              </CardContent>
            </Card>

            <Card className="border-2 border-border lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingTasks tasks={upcomingTasks} />
              </CardContent>
            </Card>
          </div>

          {/* Recent + AI */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAssignments assignments={recentAssignments} />
              </CardContent>
            </Card>

            <Card className="border-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">AI Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <AIAssistant />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── QUESTIONS ────────────────────────────────────────────────────────── */}
        <TabsContent value="questions" className="space-y-3">
          <div className="grid gap-0 border-2 border-border divide-y divide-border">
            <Link href="/dashboard/questions" className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Create Questions</p>
                  <p className="text-xs text-muted-foreground">AI generator &amp; OCR digitizer</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link href="/dashboard/questions/browse" className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-foreground text-background">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Question Bank</p>
                  <p className="text-xs text-muted-foreground">Browse, filter, and manage questions</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link href="/dashboard/ingest?mode=shadow" className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-muted text-foreground">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Shadow Paper</p>
                  <p className="text-xs text-muted-foreground">Clone a past paper with AI</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link href="/dashboard/admin/audit" className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-muted text-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">QC Audit</p>
                  <p className="text-xs text-muted-foreground">Review and verify question quality</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </TabsContent>

        {/* ── STUDENTS ─────────────────────────────────────────────────────────── */}
        <TabsContent value="students">
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ASSIGNMENTS ──────────────────────────────────────────────────────── */}
        <TabsContent value="assignments">
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
