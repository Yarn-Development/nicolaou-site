"use client"

import { useState } from "react"
import { 
  Target, 
  TrendingUp, 
  Award, 
  Calendar,
  CheckCircle,
  Circle,
  ChevronRight,
  Play,
  FileText
} from "lucide-react"
import type { Profile } from "@/lib/types/database"
import { SignOutButton } from "@/components/auth/sign-out-button"

// Mock student data
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

  // Calculate stats
  const totalAssignments = 40
  const completedAssignments = 34
  const completionRate = Math.round((completedAssignments / totalAssignments) * 100)
  const currentStreak = 12
  const overallScore = 87
  const studyHours = 12.5

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
            <div className="border-2 border-swiss-ink bg-swiss-concrete dark:bg-swiss-ink/5 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                OVERALL SCORE
              </p>
              <p className="text-4xl font-black text-swiss-signal">{overallScore}%</p>
            </div>
            
            <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                CURRENT STREAK
              </p>
              <p className="text-4xl font-black text-swiss-ink">{currentStreak}</p>
              <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
                DAYS
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
            {["OVERVIEW", "ASSIGNMENTS", "PROGRESS", "PRACTICE"].map((tab) => (
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
                    <div className="w-full h-3 bg-swiss-concrete dark:bg-swiss-ink/10 border-2 border-swiss-ink">
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
                        className="text-swiss-concrete dark:text-swiss-ink/10"
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
                  <div className="w-full h-2 bg-swiss-concrete dark:bg-swiss-ink/10 border border-swiss-ink">
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

            <div className="border-2 border-swiss-ink bg-swiss-concrete dark:bg-swiss-ink/5 p-12 text-center">
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
