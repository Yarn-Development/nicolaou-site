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
import { motion } from "framer-motion"
import { BookOpen, Calendar, FileText, GraduationCap, Users } from "lucide-react"

export function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, Professor! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glassmorphic">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="glassmorphic">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">128</div>
                  <p className="text-xs text-muted-foreground">+4 from last month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="glassmorphic">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-xs text-muted-foreground">2 ending this month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="glassmorphic">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">8 need grading</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card className="glassmorphic">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-muted-foreground">+2.5% from last term</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="glassmorphic md:col-span-4">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Average scores across all subjects</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceChart />
              </CardContent>
            </Card>

            <Card className="glassmorphic md:col-span-3">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>Tasks scheduled for the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <UpcomingTasks />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Recent Assignments</CardTitle>
                <CardDescription>Latest assignments and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentAssignments />
              </CardContent>
            </Card>

            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>Get help with your teaching tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <AIAssistant />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>View and manage your students</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Assignment Management</CardTitle>
              <CardDescription>Create, assign, and grade assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-muted-foreground">Assignment management interface will be displayed here</p>
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
