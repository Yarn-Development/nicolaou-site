"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Target, 
  TrendingUp, 
  Award, 
  Calendar,
  CheckCircle,
  Circle,
  Play,
  FileText,
  Users,
  BookOpen,
  Loader2,
  Clock,
  AlertCircle,
  Eye,
  LogOut,
  Laptop,
  Printer,
  PenLine
} from "lucide-react"
import type { Profile } from "@/lib/types/database"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { JoinClassCard } from "@/components/join-class-card"
import { leaveClass } from "@/app/actions/classes"
import { 
  getStudentClasses, 
  getStudentAssignments,
  type StudentClass,
  type StudentAssignment 
} from "@/app/actions/student"
import { getStudentDashboardData, type StudentDashboardData } from "@/app/actions/feedback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface StudentDashboardClientProps {
  profile: Profile
}

export default function StudentDashboardClient({ profile }: StudentDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [leavingClass, setLeavingClass] = useState<string | null>(null)

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setIsLoading(true)
    
    // Fetch data in parallel
    const [classesResult, assignmentsResult, dashboardResult] = await Promise.all([
      getStudentClasses(),
      getStudentAssignments(),
      getStudentDashboardData()
    ])

    if (classesResult.success && classesResult.data) {
      setClasses(classesResult.data)
    }

    if (assignmentsResult.success && assignmentsResult.data) {
      setAssignments(assignmentsResult.data)
    }

    if (dashboardResult.success && dashboardResult.data) {
      setDashboardData(dashboardResult.data)
    }

    setIsLoading(false)
  }

  const handleLeaveClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to leave "${className}"? You will lose access to assignments in this class.`)) {
      return
    }

    setLeavingClass(classId)
    const result = await leaveClass(classId)
    
    if (result.success) {
      fetchAllData() // Refresh all data
    }
    
    setLeavingClass(null)
  }

  // Separate assignments by status
  const pendingAssignments = assignments.filter(a => a.status === "todo")
  const completedAssignments = assignments.filter(a => a.status === "graded" || a.status === "submitted")

  // Calculate stats
  const stats = {
    totalClasses: classes.length,
    totalAssignments: assignments.length,
    completedCount: completedAssignments.length,
    pendingCount: pendingAssignments.length,
    averageScore: dashboardData?.overallStats.averageScore || 0,
  }
  
  const completionRate = stats.totalAssignments > 0 
    ? Math.round((stats.completedCount / stats.totalAssignments) * 100) 
    : 0

  // Helper function to format due date
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    
    const date = new Date(dateStr)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
    if (days === 0) return "Due today"
    if (days === 1) return "Due tomorrow"
    if (days <= 7) return `Due in ${days} days`
    return date.toLocaleDateString()
  }

  // Helper to check if overdue
  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  // Helper to get RAG color
  const getRAGColor = (percentage: number | null) => {
    if (percentage === null) return { bg: "bg-gray-100", text: "text-gray-500" }
    if (percentage >= 70) return { bg: "bg-green-100", text: "text-green-600" }
    if (percentage >= 40) return { bg: "bg-amber-100", text: "text-amber-600" }
    return { bg: "bg-red-100", text: "text-red-600" }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-swiss-paper flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-swiss-signal mx-auto mb-4" />
          <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-swiss-paper">
      {/* Header */}
      <header className="border-b-2 border-swiss-ink bg-swiss-paper">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-widest text-swiss-ink mb-2">
                MY LEARNING
              </h1>
              <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                Welcome back, {profile.full_name || profile.email.split("@")[0]}!
              </p>
            </div>
            <div className="w-48">
              <SignOutButton />
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`border-2 border-swiss-ink p-4 ${getRAGColor(stats.averageScore).bg}`}>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                AVERAGE SCORE
              </p>
              <p className={`text-4xl font-black ${getRAGColor(stats.averageScore).text}`}>
                {stats.averageScore}%
              </p>
            </div>
            
            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                MY CLASSES
              </p>
              <p className="text-4xl font-black text-swiss-ink">
                {stats.totalClasses}
              </p>
              <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                ENROLLED
              </p>
            </div>

            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                COMPLETION
              </p>
              <p className="text-4xl font-black text-swiss-ink">{completionRate}%</p>
              <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                {stats.completedCount}/{stats.totalAssignments} DONE
              </p>
            </div>

            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                PENDING
              </p>
              <p className="text-4xl font-black text-swiss-signal">
                {stats.pendingCount}
              </p>
              <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                ASSIGNMENTS
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b-2 border-swiss-ink bg-swiss-paper sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {["OVERVIEW", "CLASSES", "ASSIGNMENTS", "PROGRESS"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab.toLowerCase())}
                className={`px-6 py-4 font-black uppercase tracking-widest text-xs transition-colors duration-200 border-b-4 ${
                  selectedTab === tab.toLowerCase()
                    ? "border-swiss-signal text-swiss-signal"
                    : "border-transparent text-swiss-lead hover:text-swiss-ink hover:border-swiss-ink/20"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* OVERVIEW TAB */}
        {selectedTab === "overview" && (
          <div className="space-y-8">
            {/* My Classes Section */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-swiss-signal" />
                MY CLASSES
              </h2>
              
              {classes.length === 0 ? (
                // No classes - show big Join Class card
                <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
                  <div className="max-w-md mx-auto text-center mb-6">
                    <Users className="w-16 h-16 mx-auto text-swiss-lead/40 mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-swiss-ink mb-2">
                      NO CLASSES YET
                    </h3>
                    <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                      Join your first class using a code from your teacher
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <JoinClassCard />
                  </div>
                </div>
              ) : (
                // Show horizontal scrollable class cards
                <div className="grid gap-6 md:grid-cols-2">
                  <JoinClassCard />
                  
                  {/* Class Cards Horizontal Scroll */}
                  <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
                    <h3 className="font-black uppercase tracking-tight text-swiss-ink text-sm mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-swiss-signal" />
                      ENROLLED ({classes.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {classes.map((cls) => (
                        <div
                          key={cls.class_id}
                          className="border border-swiss-ink p-3 bg-swiss-concrete hover:bg-swiss-lead/10 transition-colors"
                        >
                          <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                            {cls.class_name}
                          </p>
                          <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            {cls.subject} • {cls.teacher_name}
                          </p>
                        </div>
                      ))}
                    </div>
                    {classes.length > 3 && (
                      <button
                        onClick={() => setSelectedTab("classes")}
                        className="text-xs text-swiss-signal font-bold uppercase tracking-wider hover:underline mt-3"
                      >
                        View All Classes →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Upcoming Assignments */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-swiss-signal" />
                PENDING ASSIGNMENTS
              </h2>

              <div className="space-y-3">
                {pendingAssignments.length === 0 ? (
                  <div className="border-2 border-swiss-ink bg-swiss-concrete p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                      All caught up!
                    </p>
                    <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                      No pending assignments
                    </p>
                  </div>
                ) : (
                  pendingAssignments.slice(0, 5).map((assignment) => {
                    const overdue = isOverdue(assignment.due_date)
                    const isOnline = assignment.mode === "online"
                    
                    return (
                      <div
                        key={assignment.id}
                        className={`border-2 border-swiss-ink bg-swiss-paper p-4 flex items-center justify-between hover:border-swiss-signal transition-colors duration-200 ${
                          overdue ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 border-2 flex items-center justify-center ${
                            overdue 
                              ? "border-red-500 bg-red-100" 
                              : isOnline 
                                ? "border-swiss-signal bg-swiss-signal"
                                : "border-amber-500 bg-amber-100"
                          }`}>
                            {isOnline ? (
                              <Laptop className={`w-5 h-5 ${overdue ? "text-red-500" : "text-white"}`} />
                            ) : (
                              <Printer className={`w-5 h-5 ${overdue ? "text-red-500" : "text-amber-600"}`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                                {assignment.title}
                              </p>
                              {!isOnline && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 font-bold">
                                  PAPER
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                                {assignment.class_name}
                              </span>
                              <span className={`text-xs uppercase tracking-wider font-bold ${
                                overdue ? "text-red-600" : "text-swiss-signal"
                              }`}>
                                {isOnline ? "Due: " : "Exam: "}{formatDueDate(assignment.due_date)}
                              </span>
                              {assignment.max_marks > 0 && (
                                <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                                  • {assignment.max_marks} marks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOnline ? (
                          <Link href={`/student-dashboard/assignments/${assignment.id}/take`}>
                            <Button 
                              size="sm"
                              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          </Link>
                        ) : (
                          <Button 
                            size="sm"
                            variant="outline"
                            disabled
                            className="border-amber-500 text-amber-600 font-bold uppercase tracking-wider cursor-not-allowed"
                          >
                            <PenLine className="w-4 h-4 mr-2" />
                            In Class
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}

                {pendingAssignments.length > 5 && (
                  <button
                    onClick={() => setSelectedTab("assignments")}
                    className="w-full border-2 border-swiss-ink p-3 text-center text-xs font-bold uppercase tracking-wider text-swiss-signal hover:bg-swiss-concrete transition-colors"
                  >
                    View All {pendingAssignments.length} Pending Assignments →
                  </button>
                )}
              </div>
            </section>

            {/* Topic Mastery Preview */}
            {dashboardData?.topicMastery && dashboardData.topicMastery.length > 0 && (
              <section>
                <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                  <Target className="w-6 h-6 text-swiss-signal" />
                  TOPIC MASTERY
                </h2>
                
                <div className="space-y-4">
                  {dashboardData.topicMastery.slice(0, 3).map((topic, index) => {
                    const colors = getRAGColor(topic.percentage)
                    
                    return (
                      <div
                        key={topic.topic}
                        className={`border-2 border-swiss-ink p-6 ${colors.bg}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl font-black text-swiss-lead/20">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-lg font-black uppercase tracking-wider text-swiss-ink">
                              {topic.topic}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className={`text-3xl font-black ${colors.text}`}>
                              {topic.percentage}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-white border-2 border-swiss-ink">
                          <div
                            className={`h-full transition-all duration-500 ${
                              topic.percentage >= 70 ? "bg-green-500" :
                              topic.percentage >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${topic.percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  
                  {dashboardData.topicMastery.length > 3 && (
                    <button
                      onClick={() => setSelectedTab("progress")}
                      className="w-full border-2 border-swiss-ink p-3 text-center text-xs font-bold uppercase tracking-wider text-swiss-signal hover:bg-swiss-concrete transition-colors"
                    >
                      View All {dashboardData.topicMastery.length} Topics →
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* CLASSES TAB */}
        {selectedTab === "classes" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink flex items-center gap-3">
                <Users className="w-6 h-6 text-swiss-signal" />
                MY CLASSES
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <JoinClassCard />

              <div className="border-2 border-swiss-ink bg-swiss-concrete p-6">
                <h3 className="font-black uppercase tracking-tight text-swiss-ink mb-2">
                  QUICK STATS
                </h3>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                      Total Classes
                    </span>
                    <span className="text-lg font-black text-swiss-ink">
                      {classes.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                      Pending Assignments
                    </span>
                    <span className="text-lg font-black text-swiss-ink">
                      {stats.pendingCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Classes List */}
            {classes.length === 0 ? (
              <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-swiss-lead/40 mb-6" />
                <h3 className="text-xl font-black uppercase tracking-widest text-swiss-ink mb-3">
                  NO CLASSES YET
                </h3>
                <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold max-w-md mx-auto">
                  Ask your teacher for a class code and join your first class to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => (
                  <div
                    key={cls.class_id}
                    className="border-2 border-swiss-ink bg-swiss-paper p-6 hover:border-swiss-signal transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold uppercase tracking-wider text-swiss-ink mb-2">
                          {cls.class_name}
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs px-2 py-1 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                            {cls.subject}
                          </span>
                          <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            Teacher: {cls.teacher_name}
                          </span>
                          <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            Joined: {new Date(cls.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleLeaveClass(cls.class_id, cls.class_name)}
                        disabled={leavingClass === cls.class_id}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-swiss-signal text-swiss-signal font-bold uppercase tracking-wider text-xs hover:bg-swiss-signal hover:text-white transition-colors disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" />
                        {leavingClass === cls.class_id ? "Leaving..." : "Leave"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {selectedTab === "assignments" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink flex items-center gap-3">
                <FileText className="w-6 h-6 text-swiss-signal" />
                ASSIGNMENTS
              </h2>
            </div>

            {/* Pending Section */}
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-4 flex items-center gap-2">
                <Circle className="w-5 h-5 text-swiss-signal" />
                PENDING ({pendingAssignments.length})
              </h3>

              {pendingAssignments.length === 0 ? (
                <div className="border-2 border-swiss-ink bg-swiss-concrete p-6 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                    No pending assignments
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAssignments.map((assignment) => {
                    const overdue = isOverdue(assignment.due_date)
                    const isOnline = assignment.mode === "online"
                    
                    return (
                      <div
                        key={assignment.id}
                        className={`border-2 border-swiss-ink bg-swiss-paper p-4 flex items-center justify-between ${
                          overdue ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {isOnline ? (
                            <Laptop className={`w-5 h-5 ${overdue ? "text-red-500" : "text-swiss-signal"}`} />
                          ) : (
                            <Printer className={`w-5 h-5 ${overdue ? "text-red-500" : "text-amber-500"}`} />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                                {assignment.title}
                              </p>
                              {!isOnline && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold uppercase tracking-wider border border-amber-300">
                                  Paper
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 border border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                                {assignment.class_name}
                              </span>
                              <span className={`text-xs uppercase tracking-wider font-bold ${
                                overdue ? "text-red-600" : isOnline ? "text-swiss-signal" : "text-amber-600"
                              }`}>
                                {isOnline ? "Due: " : "Exam: "}{formatDueDate(assignment.due_date)}
                              </span>
                              {assignment.max_marks > 0 && (
                                <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                                  {assignment.max_marks} marks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {isOnline ? (
                          <Link href={`/student-dashboard/assignments/${assignment.id}/take`}>
                            <Button 
                              size="sm"
                              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          </Link>
                        ) : (
                          <Button 
                            size="sm"
                            disabled
                            className="bg-amber-100 text-amber-700 border-2 border-amber-300 font-bold uppercase tracking-wider cursor-not-allowed"
                          >
                            <PenLine className="w-4 h-4 mr-2" />
                            In Class
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Completed Section */}
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                COMPLETED ({completedAssignments.length})
              </h3>

              {completedAssignments.length === 0 ? (
                <div className="border-2 border-swiss-ink bg-swiss-paper p-6 text-center">
                  <FileText className="w-8 h-8 mx-auto text-swiss-lead/40 mb-2" />
                  <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                    No completed assignments yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedAssignments.map((assignment) => {
                    const colors = getRAGColor(assignment.percentage)
                    const isGraded = assignment.status === "graded"
                    const isOnline = assignment.mode === "online"
                    
                    return (
                      <div
                        key={assignment.id}
                        className={`border-2 border-swiss-ink p-4 flex items-center justify-between ${
                          isGraded ? colors.bg : "bg-swiss-paper"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {isGraded ? (
                            isOnline ? (
                              <Laptop className={`w-5 h-5 ${colors.text}`} />
                            ) : (
                              <Printer className={`w-5 h-5 ${colors.text}`} />
                            )
                          ) : (
                            isOnline ? (
                              <Laptop className="w-5 h-5 text-amber-500" />
                            ) : (
                              <Printer className="w-5 h-5 text-amber-500" />
                            )
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                                {assignment.title}
                              </p>
                              {!isOnline && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold uppercase tracking-wider border border-amber-300">
                                  Paper
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 border border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                                {assignment.class_name}
                              </span>
                              {isGraded && assignment.percentage !== null && (
                                <span className={`text-xs uppercase tracking-wider font-bold ${colors.text}`}>
                                  {assignment.score}/{assignment.max_marks} ({assignment.percentage}%)
                                </span>
                              )}
                              {!isGraded && (
                                <span className="text-xs text-amber-600 uppercase tracking-wider font-bold">
                                  Awaiting Grade
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          {isGraded && assignment.feedback_released && assignment.submission_id ? (
                            <Link href={`/dashboard/feedback/submission/${assignment.submission_id}`}>
                              <Button 
                                size="sm"
                                variant="outline"
                                className="border-swiss-signal text-swiss-signal hover:bg-swiss-signal hover:text-white font-bold uppercase tracking-wider"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Feedback
                              </Button>
                            </Link>
                          ) : isGraded ? (
                            <Badge variant="outline" className="border-swiss-ink text-swiss-ink font-bold uppercase">
                              Graded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 font-bold uppercase">
                              <Clock className="w-3 h-3 mr-1" />
                              Submitted
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Empty State */}
            {assignments.length === 0 && (
              <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-swiss-lead/40 mb-6" />
                <h3 className="text-xl font-black uppercase tracking-widest text-swiss-ink mb-3">
                  NO ASSIGNMENTS YET
                </h3>
                <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold max-w-md mx-auto">
                  Join a class to start receiving assignments
                </p>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {selectedTab === "progress" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-swiss-signal" />
              YOUR PROGRESS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Progress */}
              <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-lead mb-6">
                  OVERALL PROGRESS
                </h3>
                
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="16"
                        fill="none"
                        className="text-swiss-concrete"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - stats.averageScore / 100)}`}
                        className={`transition-all duration-1000 ${
                          stats.averageScore >= 70 ? "text-green-500" :
                          stats.averageScore >= 40 ? "text-amber-500" : "text-red-500"
                        }`}
                        strokeLinecap="square"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className={`text-5xl font-black ${getRAGColor(stats.averageScore).text}`}>
                          {stats.averageScore}%
                        </p>
                        <p className="text-xs text-swiss-lead uppercase tracking-widest font-bold">
                          AVERAGE
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                      COMPLETED ASSIGNMENTS
                    </span>
                    <span className="text-sm font-black text-swiss-ink">
                      {stats.completedCount}/{stats.totalAssignments}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-swiss-concrete border border-swiss-ink">
                    <div
                      className="h-full bg-swiss-signal"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Topic Summary */}
              <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-lead mb-6">
                  TOPIC BREAKDOWN
                </h3>

                {dashboardData?.topicMastery && dashboardData.topicMastery.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.overallStats.bestTopic && (
                      <div className="border-b-2 border-swiss-ink/10 pb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                          STRONGEST TOPIC
                        </p>
                        <div className="flex items-center gap-3">
                          <Award className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="text-lg font-black text-swiss-ink uppercase">
                              {dashboardData.overallStats.bestTopic}
                            </p>
                            <p className="text-xs text-green-600 uppercase font-bold">
                              Keep it up!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {dashboardData.overallStats.weakestTopic && (
                      <div className="pb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                          NEEDS ATTENTION
                        </p>
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                          <div>
                            <p className="text-lg font-black text-swiss-ink uppercase">
                              {dashboardData.overallStats.weakestTopic}
                            </p>
                            <p className="text-xs text-red-600 uppercase font-bold">
                              Focus your revision here
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-swiss-lead/40 mb-4" />
                    <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                      Complete assignments to see your topic breakdown
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* All Topics */}
            {dashboardData?.topicMastery && dashboardData.topicMastery.length > 0 && (
              <div className="border-2 border-swiss-ink bg-swiss-paper p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-lead mb-6">
                  ALL TOPICS
                </h3>
                <div className="space-y-4">
                  {dashboardData.topicMastery.map((topic) => {
                    const colors = getRAGColor(topic.percentage)
                    return (
                      <div key={topic.topic} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm uppercase tracking-wider">
                              {topic.topic}
                            </span>
                            <span className={`font-black text-lg ${colors.text}`}>
                              {topic.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-3 bg-swiss-concrete border border-swiss-ink">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                topic.percentage >= 70 ? "bg-green-500" :
                                topic.percentage >= 40 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${topic.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
