"use client"

import { useState, useEffect } from "react"
import { 
  Target, 
  TrendingUp, 
  Award, 
  Calendar,
  CheckCircle,
  Circle,
  ChevronRight,
  Play,
  FileText,
  Users,
  BookOpen,
  LogOut
} from "lucide-react"
import type { Profile } from "@/lib/types/database"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { JoinClassCard } from "@/components/join-class-card"
import { getEnrolledClasses, leaveClass } from "@/app/actions/classes"

// Mock student data (will be replaced with real data later)
const topicMastery = [
  { topic: "ALGEBRA", mastery: 92, total: 45, completed: 41 },
  { topic: "GEOMETRY", mastery: 85, total: 38, completed: 32 },
  { topic: "STATISTICS", mastery: 78, total: 30, completed: 23 },
  { topic: "NUMBER", mastery: 94, total: 42, completed: 39 },
  { topic: "RATIO", mastery: 82, total: 35, completed: 29 }
]

const recentAssignments = [
  {
    id: 1,
    title: "Quadratic Equations Practice",
    topic: "ALGEBRA",
    score: 94,
    completed: true,
    dueDate: "2 DAYS AGO",
    marks: "28/30"
  },
  {
    id: 2,
    title: "Trigonometry Applications",
    topic: "GEOMETRY", 
    score: 87,
    completed: true,
    dueDate: "5 DAYS AGO",
    marks: "26/30"
  },
  {
    id: 3,
    title: "Statistics Data Analysis",
    topic: "STATISTICS",
    score: null,
    completed: false,
    dueDate: "DUE TOMORROW",
    marks: "0/25"
  },
  {
    id: 4,
    title: "Percentage Calculations",
    topic: "NUMBER",
    score: null,
    completed: false,
    dueDate: "DUE IN 3 DAYS", 
    marks: "0/20"
  }
]

const upcomingTasks = [
  { id: 1, title: "Complete Statistics worksheet", type: "assignment", urgent: true },
  { id: 2, title: "Watch Trigonometry video", type: "lesson", urgent: false },
  { id: 3, title: "Practice test preparation", type: "practice", urgent: true },
  { id: 4, title: "Submit Algebra homework", type: "assignment", urgent: false }
]

interface StudentDashboardClientProps {
  profile: Profile
}

export default function StudentDashboardClient({ profile }: StudentDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [enrolledClasses, setEnrolledClasses] = useState<Array<{
    id: string
    name: string
    subject: string
    joined_at: string
    teacher?: { full_name: string | null; email: string }[]
  }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [leavingClass, setLeavingClass] = useState<string | null>(null)

  // Calculate stats
  const totalAssignments = 40
  const completedAssignments = 34
  const completionRate = Math.round((completedAssignments / totalAssignments) * 100)
  const currentStreak = 12
  const overallScore = 87
  const studyHours = 12.5

  // Fetch enrolled classes
  useEffect(() => {
    fetchEnrolledClasses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEnrolledClasses = async () => {
    setLoadingClasses(true)
    const result = await getEnrolledClasses()
    if (result.success && result.data) {
      setEnrolledClasses(result.data)
    }
    setLoadingClasses(false)
  }

  const handleLeaveClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to leave "${className}"?`)) {
      return
    }

    setLeavingClass(classId)
    const result = await leaveClass(classId)
    
    if (result.success) {
      fetchEnrolledClasses()
    }
    
    setLeavingClass(null)
  }

  return (
    <div className="min-h-screen bg-swiss-paper">
      {/* Header */}
      <header className="border-b-2 border-swiss-ink bg-swiss-paper">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-widest text-swiss-ink mb-2">
                STUDENT PORTAL
              </h1>
              <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                {profile.full_name || profile.email}
              </p>
            </div>
            <div className="w-48">
              <SignOutButton />
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-2 border-swiss-ink bg-swiss-concrete p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                OVERALL SCORE
              </p>
              <p className="text-4xl font-black text-swiss-signal">{overallScore}%</p>
            </div>
            
            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                MY CLASSES
              </p>
              <p className="text-4xl font-black text-swiss-ink">{enrolledClasses.length}</p>
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
                {completedAssignments}/{totalAssignments}
              </p>
            </div>

            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                STUDY TIME
              </p>
              <p className="text-4xl font-black text-swiss-ink">{studyHours}</p>
              <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                HRS THIS WEEK
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b-2 border-swiss-ink bg-swiss-paper sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {["OVERVIEW", "CLASSES", "ASSIGNMENTS", "PROGRESS", "PRACTICE"].map((tab) => (
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
            {/* Join Class Card */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-swiss-signal" />
                MY CLASSES
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <JoinClassCard />
                
                {/* Quick class summary */}
                <div className="border-2 border-swiss-ink bg-swiss-paper p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-swiss-signal" />
                    <h3 className="font-black uppercase tracking-tight text-swiss-ink">
                      ENROLLED CLASSES
                    </h3>
                  </div>
                  
                  {loadingClasses ? (
                    <p className="text-sm text-swiss-lead">Loading classes...</p>
                  ) : enrolledClasses.length === 0 ? (
                    <p className="text-sm text-swiss-lead">
                      You haven&apos;t joined any classes yet. Use a class code to get started!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {enrolledClasses.slice(0, 3).map((cls) => (
                        <div
                          key={cls.id}
                          className="border border-swiss-ink p-3 bg-swiss-concrete"
                        >
                          <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                            {cls.name}
                          </p>
                          <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            {cls.subject}
                          </p>
                        </div>
                      ))}
                      {enrolledClasses.length > 3 && (
                        <button
                          onClick={() => setSelectedTab("classes")}
                          className="text-xs text-swiss-signal font-bold uppercase tracking-wider hover:underline"
                        >
                          View All {enrolledClasses.length} Classes →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Topic Mastery */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                <Target className="w-6 h-6 text-swiss-signal" />
                TOPIC MASTERY
              </h2>
              
              <div className="space-y-4">
                {topicMastery.map((topic, index) => (
                  <div
                    key={topic.topic}
                    className="border-2 border-swiss-ink bg-swiss-paper p-6 hover:border-swiss-signal transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-black text-swiss-lead/20">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-wider text-swiss-ink">
                            {topic.topic}
                          </h3>
                          <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            {topic.completed}/{topic.total} EXERCISES COMPLETE
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-swiss-signal">{topic.mastery}%</p>
                        <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                          MASTERY
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-swiss-concrete border-2 border-swiss-ink">
                      <div
                        className="h-full bg-swiss-signal transition-all duration-300"
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Today's Tasks */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-swiss-signal" />
                TODAY&apos;S TASKS
              </h2>

              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border-2 border-swiss-ink bg-swiss-paper p-4 flex items-center justify-between hover:border-swiss-signal transition-colors duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 border-2 flex items-center justify-center ${
                        task.type === 'assignment' ? 'border-swiss-signal bg-swiss-signal' :
                        task.type === 'lesson' ? 'border-swiss-ink bg-swiss-ink' :
                        'border-swiss-ink bg-swiss-paper'
                      }`}>
                        {task.type === 'assignment' ? <FileText className="w-4 h-4 text-white" /> :
                         task.type === 'lesson' ? <Play className="w-4 h-4 text-white" /> :
                         <Target className="w-4 h-4 text-swiss-ink" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-wider text-swiss-ink">
                          {task.title}
                        </p>
                        <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                          {task.type}
                        </p>
                      </div>
                      {task.urgent && (
                        <span className="px-3 py-1 bg-swiss-signal text-white text-xs font-black uppercase tracking-wider">
                          URGENT
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-swiss-lead" />
                  </div>
                ))}
              </div>
            </section>
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
              {/* Join Class Card */}
              <JoinClassCard />

              {/* Placeholder for another action card if needed */}
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
                      {enrolledClasses.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                      Active Assignments
                    </span>
                    <span className="text-lg font-black text-swiss-ink">
                      {recentAssignments.filter(a => !a.completed).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Classes List */}
            {loadingClasses ? (
              <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
                <p className="text-swiss-lead font-bold uppercase tracking-wider">
                  Loading classes...
                </p>
              </div>
            ) : enrolledClasses.length === 0 ? (
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
                {enrolledClasses.map((cls) => {
                  const teacher = Array.isArray(cls.teacher) && cls.teacher.length > 0 
                    ? cls.teacher[0] 
                    : null

                  return (
                    <div
                      key={cls.id}
                      className="border-2 border-swiss-ink bg-swiss-paper p-6 hover:border-swiss-signal transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold uppercase tracking-wider text-swiss-ink mb-2">
                            {cls.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                              {cls.subject}
                            </span>
                            {teacher && (
                              <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                                Teacher: {teacher.full_name || teacher.email}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-2">
                            Joined: {new Date(cls.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleLeaveClass(cls.id, cls.name)}
                          disabled={leavingClass === cls.id}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-swiss-signal text-swiss-signal font-bold uppercase tracking-wider text-xs hover:bg-swiss-signal hover:text-white transition-colors disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4" />
                          {leavingClass === cls.id ? "Leaving..." : "Leave"}
                        </button>
                      </div>
                    </div>
                  )
                })}
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
              <div className="flex gap-2">
                <button className="px-4 py-2 border-2 border-swiss-signal bg-swiss-signal text-white font-bold uppercase tracking-wider text-xs">
                  ALL
                </button>
                <button className="px-4 py-2 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider text-xs hover:border-swiss-signal">
                  PENDING
                </button>
                <button className="px-4 py-2 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider text-xs hover:border-swiss-signal">
                  COMPLETED
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border-2 border-swiss-ink bg-swiss-paper p-6 hover:border-swiss-signal transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {assignment.completed ? (
                          <CheckCircle className="w-5 h-5 text-swiss-signal" />
                        ) : (
                          <Circle className="w-5 h-5 text-swiss-lead" />
                        )}
                        <h3 className="text-lg font-bold uppercase tracking-wider text-swiss-ink">
                          {assignment.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 ml-8">
                        <span className="text-xs px-2 py-1 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                          {assignment.topic}
                        </span>
                        <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                          {assignment.dueDate}
                        </span>
                        <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                          {assignment.marks} MARKS
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {assignment.completed ? (
                        <div>
                          <p className="text-3xl font-black text-swiss-signal mb-1">
                            {assignment.score}%
                          </p>
                          <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                            SCORE
                          </p>
                        </div>
                      ) : (
                        <button className="px-6 py-3 bg-swiss-signal text-white font-bold uppercase tracking-wider text-sm hover:bg-swiss-ink transition-colors duration-200">
                          START
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - overallScore / 100)}`}
                        className="text-swiss-signal transition-all duration-1000"
                        strokeLinecap="square"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-5xl font-black text-swiss-ink">{overallScore}%</p>
                        <p className="text-xs text-swiss-lead uppercase tracking-widest font-bold">
                          OVERALL
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
                      {completedAssignments}/{totalAssignments}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-swiss-concrete border border-swiss-ink">
                    <div
                      className="h-full bg-swiss-signal"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Study Stats */}
              <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-lead mb-6">
                  STUDY STATISTICS
                </h3>

                <div className="space-y-6">
                  <div className="border-b-2 border-swiss-ink/10 pb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                      TOTAL STUDY TIME
                    </p>
                    <p className="text-4xl font-black text-swiss-ink">52.5 HRS</p>
                    <p className="text-xs text-swiss-signal uppercase tracking-wider font-bold mt-1">
                      ↑ 8% FROM LAST MONTH
                    </p>
                  </div>

                  <div className="border-b-2 border-swiss-ink/10 pb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                      CURRENT STREAK
                    </p>
                    <p className="text-4xl font-black text-swiss-ink">{currentStreak} DAYS</p>
                    <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                      LONGEST: 18 DAYS
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                      AVERAGE SCORE
                    </p>
                    <p className="text-4xl font-black text-swiss-ink">{overallScore}%</p>
                    <p className="text-xs text-swiss-signal uppercase tracking-wider font-bold mt-1">
                      ↑ 5% FROM LAST WEEK
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRACTICE TAB */}
        {selectedTab === "practice" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-swiss-ink mb-6 flex items-center gap-3">
              <Award className="w-6 h-6 text-swiss-signal" />
              PRACTICE & RECOMMENDATIONS
            </h2>

            <div className="border-2 border-swiss-ink bg-swiss-concrete p-12 text-center">
              <Target className="w-16 h-16 mx-auto text-swiss-lead/40 mb-6" />
              <h3 className="text-xl font-black uppercase tracking-widest text-swiss-ink mb-3">
                AI-POWERED PRACTICE
              </h3>
              <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold max-w-md mx-auto">
                Personalized question recommendations based on your learning gaps will appear here
              </p>
              <button className="mt-8 px-8 py-4 bg-swiss-signal text-white font-bold uppercase tracking-wider text-sm hover:bg-swiss-ink transition-colors duration-200">
                GENERATE PRACTICE SET
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
