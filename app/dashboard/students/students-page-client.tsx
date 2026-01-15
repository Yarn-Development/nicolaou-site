"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StudentList } from "@/components/student-list"
import { CreateClassDialog } from "@/components/create-class-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  Download,
  Upload,
  BarChart3,
  Award,
  Clock,
  TrendingUp,
  FileText,
  Mail,
  GraduationCap,
  AlertCircle,
} from "lucide-react"
import type { StudentsPageData } from "./page"

interface StudentsPageClientProps {
  data: StudentsPageData
  isDemo: boolean
}

export function StudentsPageClient({ data, isDemo }: StudentsPageClientProps) {
  const [showAddStudent, setShowAddStudent] = useState(false)
  const { stats, recentActivity, classGroups, classes } = data

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend = "neutral",
  }: {
    title: string
    value: string | number
    change?: string
    icon: React.ElementType
    trend?: "up" | "down" | "neutral"
  }) => (
    <Card className="glassmorphic">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === "up" && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            <span
              className={
                trend === "up" ? "text-green-500" : "text-muted-foreground"
              }
            >
              {change}
            </span>
            from last week
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Demo Data Banner */}
      {isDemo && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm uppercase tracking-wider">
              Demo Data
            </p>
            <p className="text-amber-700 text-xs">
              Showing sample data. Create classes and add students to see real
              statistics.
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-amber-400 text-amber-700 font-bold"
          >
            DEMO
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">
            Manage your students, track progress, and organize classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateClassDialog>
            <Button className="bg-primary hover:bg-primary/90">
              <GraduationCap className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          </CreateClassDialog>
          <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
            <DialogTrigger asChild>
              <Button variant="outline" className="glassmorphic border-muted/30">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphic border-muted/30">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Add a new student to your class. They&apos;ll receive an
                  invitation email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    placeholder="Enter student name"
                    className="glassmorphic border-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    placeholder="student@example.com"
                    className="glassmorphic border-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select>
                    <SelectTrigger className="glassmorphic border-muted/30">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length > 0 ? (
                        classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="9a">Class 9A</SelectItem>
                          <SelectItem value="9b">Class 9B</SelectItem>
                          <SelectItem value="10a">Class 10A</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddStudent(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="glassmorphic border-muted/30">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" className="glassmorphic border-muted/30">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.total}
          change={stats.newThisWeek > 0 ? `+${stats.newThisWeek} this week` : undefined}
          icon={Users}
          trend={stats.newThisWeek > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Active Students"
          value={stats.active}
          change={stats.active > 0 ? `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% engagement` : undefined}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Avg. Performance"
          value={`${stats.averageScore}%`}
          icon={Award}
          trend="up"
        />
        <StatCard
          title="Inactive Students"
          value={stats.inactive}
          icon={UserPlus}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-students" className="space-y-4">
        <TabsList className="glassmorphic grid w-full grid-cols-4">
          <TabsTrigger value="all-students">All Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="all-students" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Student Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classGroups.map((classGroup) => (
              <Card key={classGroup.id} className="glassmorphic">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {classGroup.name}
                    <Badge variant="secondary">
                      {classGroup.students} students
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Score</span>
                      <span className="font-bold text-primary">
                        {classGroup.averageScore}%
                      </span>
                    </div>
                    <Progress value={classGroup.averageScore} className="h-2" />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Active Assignments</span>
                      <span>{classGroup.activeAssignments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subject</span>
                      <span className="text-foreground">
                        {classGroup.subject}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 glassmorphic border-muted/30"
                    variant="outline"
                  >
                    Manage Class
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Recent Student Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 glassmorphic rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === "assignment"
                            ? "bg-primary/20 text-primary"
                            : activity.type === "practice"
                              ? "bg-secondary/20 text-secondary"
                              : "bg-accent/20 text-accent"
                        }`}
                      >
                        {activity.type === "assignment" ? (
                          <FileText className="h-4 w-4" />
                        ) : activity.type === "practice" ? (
                          <BarChart3 className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{activity.student}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {activity.score && (
                        <Badge
                          variant="outline"
                          className="text-green-500 border-green-500/50"
                        >
                          {activity.score}%
                        </Badge>
                      )}
                      {activity.progress && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={activity.progress}
                            className="w-16 h-2"
                          />
                          <span className="text-sm text-muted-foreground">
                            {activity.progress}%
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Class Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Detailed performance analytics will be displayed here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Charts showing student progress, topic mastery, and
                  comparative analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
