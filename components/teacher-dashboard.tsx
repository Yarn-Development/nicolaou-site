"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentAssignments } from "@/components/recent-assignments"
import { StudentList } from "@/components/student-list"
import { UpcomingTasks } from "@/components/upcoming-tasks"
import { AIAssistant } from "@/components/ai-assistant"
import { AIToolsPage } from "@/components/ai-tools-page"
import { BookOpen, Calendar, FileText, GraduationCap, Users } from "lucide-react"

export function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-8">
      {/* Header - Asymmetric Grid */}
      <div className="grid grid-cols-12 gap-8 border-b border-ink pb-6">
        <div className="col-span-12 md:col-span-3">
          <span className="block text-sm font-bold uppercase tracking-widest text-signal mb-2">
            Dashboard
          </span>
        </div>
        <div className="col-span-12 md:col-span-6">
          <h2 className="text-4xl font-black tracking-tight uppercase mb-2">Welcome Back</h2>
          <p className="text-lead font-medium">Here&apos;s what&apos;s happening today, Professor.</p>
        </div>
        <div className="col-span-12 md:col-span-3 flex items-end justify-end">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-paper border border-ink p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-ink data-[state=active]:text-white font-bold uppercase tracking-wider text-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="students"
            className="data-[state=active]:bg-ink data-[state=active]:text-white font-bold uppercase tracking-wider text-sm"
          >
            Students
          </TabsTrigger>
          <TabsTrigger 
            value="assignments"
            className="data-[state=active]:bg-ink data-[state=active]:text-white font-bold uppercase tracking-wider text-sm"
          >
            Assignments
          </TabsTrigger>
          <TabsTrigger 
            value="ai-tools"
            className="data-[state=active]:bg-ink data-[state=active]:text-white font-bold uppercase tracking-wider text-sm"
          >
            AI Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid - Swiss Style */}
          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-4 border-t border-ink">
            <div className="border-r border-b border-ink p-6 bg-concrete">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Total Students</span>
                <Users className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">128</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">+4 from last month</p>
            </div>

            <div className="border-r border-b border-ink p-6 bg-paper">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Active Courses</span>
                <BookOpen className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">6</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">2 ending this month</p>
            </div>

            <div className="border-r border-b border-ink p-6 bg-paper">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Pending</span>
                <FileText className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">24</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">8 need grading</p>
            </div>

            <div className="border-b border-ink p-6 bg-signal text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest">Average Score</span>
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="text-5xl font-black mb-1">78%</div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">+2.5% from last term</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="bg-paper border-2 border-ink md:col-span-4">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight">Performance Overview</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                  Average scores across all subjects
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceChart />
              </CardContent>
            </Card>

            <Card className="bg-concrete border-2 border-ink md:col-span-3">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight">Upcoming Tasks</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                  Tasks scheduled for the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpcomingTasks />
              </CardContent>
            </Card>
          </div>

          {/* Secondary Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-paper border-2 border-ink">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight">Recent Assignments</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                  Latest assignments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentAssignments />
              </CardContent>
            </Card>

            <Card className="bg-concrete border-2 border-ink">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight">AI Assistant</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                  Get help with your teaching tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIAssistant />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card className="bg-paper border-2 border-ink">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight">Student Management</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                View and manage your students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card className="bg-paper border-2 border-ink">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight">Assignment Management</CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-wider text-lead">
                Create, assign, and grade assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 border border-ink bg-concrete">
                <p className="text-lead font-bold uppercase tracking-wider">Assignment management interface</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-tools" className="space-y-4">
          <AIToolsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
