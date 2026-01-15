"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceChart, type PerformanceDataPoint } from "@/components/performance-chart"
import { RecentAssignments, type RecentAssignment } from "@/components/recent-assignments"
import { StudentList } from "@/components/student-list"
import { UpcomingTasks, type UpcomingTask } from "@/components/upcoming-tasks"
import { AIAssistant } from "@/components/ai-assistant"
import { AIToolsPage } from "@/components/ai-tools-page"
import { BookOpen, Calendar, FileText, GraduationCap, Users, Sparkles, Database, Eye, ClipboardList, AlertCircle } from "lucide-react"
import { AssignmentList } from "@/components/assignment-list"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
      {/* Demo Data Banner */}
      {isDemo && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm uppercase tracking-wider">Demo Data</p>
            <p className="text-amber-700 text-xs">
              Showing sample data. Create classes and add students to see real statistics.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-amber-400 text-amber-700 font-bold">
            DEMO
          </Badge>
        </div>
      )}

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
        <TabsList className="bg-swiss-paper border border-swiss-ink p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-swiss-ink data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="questions"
            className="data-[state=active]:bg-swiss-ink data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm"
          >
            Questions
          </TabsTrigger>
          <TabsTrigger 
            value="students"
            className="data-[state=active]:bg-swiss-ink data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm"
          >
            Students
          </TabsTrigger>
          <TabsTrigger 
            value="assignments"
            className="data-[state=active]:bg-swiss-ink data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm"
          >
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions - Question Management */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Link href="/dashboard/questions">
              <Card className="bg-swiss-signal text-white border-2 border-swiss-ink hover:bg-swiss-signal/90 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6" />
                    <div>
                      <CardTitle className="font-black uppercase tracking-tight text-lg">
                        CREATE QUESTIONS
                      </CardTitle>
                      <CardDescription className="font-bold text-xs uppercase tracking-wider text-white/80">
                        AI Generator & OCR
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard/questions/browse">
              <Card className="bg-swiss-ink text-swiss-paper border-2 border-swiss-ink hover:bg-swiss-ink/90 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Database className="h-6 w-6" />
                    <div>
                      <CardTitle className="font-black uppercase tracking-tight text-lg text-swiss-paper">
                        QUESTION BANK
                      </CardTitle>
                      <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-paper/80">
                        Browse & Manage
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard/exam-builder">
              <Card className="bg-swiss-concrete border-2 border-swiss-ink hover:bg-swiss-lead/10 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-6 w-6 text-swiss-ink" />
                    <div>
                      <CardTitle className="font-black uppercase tracking-tight text-lg text-swiss-ink">
                        BUILD EXAMS
                      </CardTitle>
                      <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
                        Personalized Assessments
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Stats Grid - Swiss Style */}
          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-4 border-t border-ink">
            <div className="border-r border-b border-ink p-6 bg-concrete">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Total Students</span>
                <Users className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">{stats.totalStudents}</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">
                {stats.studentChange > 0 ? `+${stats.studentChange}` : stats.studentChange} from last month
              </p>
            </div>

            <div className="border-r border-b border-ink p-6 bg-paper">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Active Courses</span>
                <BookOpen className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">{stats.totalClasses}</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">
                {stats.activeStudents} active students
              </p>
            </div>

            <div className="border-r border-b border-ink p-6 bg-paper">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-lead">Pending</span>
                <FileText className="h-5 w-5 text-ink" />
              </div>
              <div className="text-5xl font-black mb-1">{stats.pendingAssignments}</div>
              <p className="text-xs font-bold uppercase tracking-wider text-lead">
                {stats.needsGrading} need grading
              </p>
            </div>

            <div className="border-b border-ink p-6 bg-signal text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest">Average Score</span>
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="text-5xl font-black mb-1">{stats.averageScore}%</div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                {stats.scoreChange >= 0 ? `+${stats.scoreChange}%` : `${stats.scoreChange}%`} from last term
              </p>
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
                <PerformanceChart data={performanceData} />
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
                <UpcomingTasks tasks={upcomingTasks} />
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
                <RecentAssignments assignments={recentAssignments} />
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

        <TabsContent value="questions" className="space-y-6">
          {/* Question Workflow Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Questions Card */}
            <Card className="bg-paper border-2 border-ink">
              <CardHeader className="border-b-2 border-ink bg-swiss-signal text-white">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6" />
                  <div>
                    <CardTitle className="font-black uppercase tracking-tight">
                      CREATE QUESTIONS
                    </CardTitle>
                    <CardDescription className="font-bold text-xs uppercase tracking-wider text-white/90">
                      AI-Powered Question Generation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-swiss-lead font-medium">
                  Generate GCSE maths questions using AI or digitize existing questions from images using OCR.
                </p>
                
                <div className="space-y-3 py-4 border-t border-swiss-ink">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">AI Generator</p>
                      <p className="text-xs text-swiss-lead">Select topic & tier, generate unique questions instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">Snip & Digitize</p>
                      <p className="text-xs text-swiss-lead">Upload image, extract LaTeX with OCR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">Live Preview</p>
                      <p className="text-xs text-swiss-lead">See rendered LaTeX in real-time as you edit</p>
                    </div>
                  </div>
                </div>

                <Link href="/dashboard/questions">
                  <Button className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider border-2 border-swiss-ink">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Open Question Creator
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Browse Question Bank Card */}
            <Card className="bg-swiss-paper border-2 border-swiss-ink">
              <CardHeader className="border-b-2 border-swiss-ink bg-swiss-ink text-swiss-paper">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6" />
                  <div>
                    <CardTitle className="font-black uppercase tracking-tight text-swiss-paper">
                      QUESTION BANK
                    </CardTitle>
                    <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-paper/90">
                      Browse & Manage Questions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-swiss-lead font-medium">
                  Search, filter, and manage your entire question library with advanced tools.
                </p>
                
                <div className="space-y-3 py-4 border-t border-swiss-ink">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-swiss-signal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">Search & Filter</p>
                      <p className="text-xs text-swiss-lead">Find questions by topic, tier, or verification status</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-swiss-signal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">Preview & Edit</p>
                      <p className="text-xs text-swiss-lead">View rendered questions, edit LaTeX, manage metadata</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-swiss-signal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">Quality Control</p>
                      <p className="text-xs text-swiss-lead">Verify questions, track usage stats, view analytics</p>
                    </div>
                  </div>
                </div>

                <Link href="/dashboard/questions/browse">
                  <Button className="w-full bg-swiss-ink hover:bg-swiss-ink/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink">
                    <Database className="w-4 h-4 mr-2" />
                    Browse Question Bank
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Exam Builder Card */}
          <Card className="bg-paper border-2 border-ink">
            <CardHeader className="border-b-2 border-ink bg-swiss-concrete">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-swiss-ink" />
                  <div>
                    <CardTitle className="font-black uppercase tracking-tight text-swiss-ink">
                      EXAM BUILDER
                    </CardTitle>
                    <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
                      Create Personalized Assessments
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <p className="text-sm text-swiss-lead font-medium">
                    Build custom exams by selecting questions from your question bank, or let AI generate complete assessments based on your criteria.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-swiss-ink p-4 bg-swiss-concrete">
                      <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-2">Features</p>
                      <ul className="space-y-2 text-xs text-swiss-ink">
                        <li className="flex items-start gap-2">
                          <span className="text-swiss-signal font-black">•</span>
                          <span>Select from question bank</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-swiss-signal font-black">•</span>
                          <span>AI-generated exams</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-swiss-signal font-black">•</span>
                          <span>Custom difficulty levels</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-swiss-signal font-black">•</span>
                          <span>Export to PDF</span>
                        </li>
                      </ul>
                    </div>

                    <div className="border-2 border-swiss-ink p-4 bg-swiss-paper">
                      <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-2">Topics Covered</p>
                      <ul className="space-y-1 text-xs text-swiss-ink">
                        <li className="font-medium">• Algebra</li>
                        <li className="font-medium">• Geometry</li>
                        <li className="font-medium">• Statistics</li>
                        <li className="font-medium">• Probability</li>
                        <li className="font-medium text-swiss-lead">+ 6 more topics</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="border-2 border-swiss-signal bg-swiss-signal/5 p-4 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-swiss-signal mb-2">Coming Soon</p>
                    <p className="text-xs text-swiss-lead">
                      Integration with question bank to select and build exams from your saved questions.
                    </p>
                  </div>

                  <Link href="/dashboard/exam-builder">
                    <Button className="w-full bg-swiss-concrete hover:bg-swiss-lead/10 text-swiss-ink font-bold uppercase tracking-wider border-2 border-swiss-ink">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Open Exam Builder
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Tools Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/assessments">
              <Card className="bg-swiss-paper border-2 border-swiss-ink hover:bg-swiss-concrete transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <ClipboardList className="h-5 w-5 text-swiss-signal" />
                    <p className="font-black uppercase tracking-tight text-swiss-ink">Assessments</p>
                  </div>
                  <p className="text-xs text-swiss-lead">Manage and track student assessments</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/feedback-example">
              <Card className="bg-swiss-paper border-2 border-swiss-ink hover:bg-swiss-concrete transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-5 w-5 text-swiss-signal" />
                    <p className="font-black uppercase tracking-tight text-swiss-ink">Feedback Sheet</p>
                  </div>
                  <p className="text-xs text-swiss-lead">View AI-powered feedback examples</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/analytics">
              <Card className="bg-swiss-paper border-2 border-swiss-ink hover:bg-swiss-concrete transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="h-5 w-5 text-swiss-signal" />
                    <p className="font-black uppercase tracking-tight text-swiss-ink">Analytics</p>
                  </div>
                  <p className="text-xs text-swiss-lead">Track performance and progress</p>
                </CardContent>
              </Card>
            </Link>
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
              <AssignmentList />
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
