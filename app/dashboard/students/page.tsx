import { getClassList, type Class } from "@/app/actions/classes"
import { getDashboardData } from "@/app/actions/dashboard"
import { StudentsPageClient } from "./students-page-client"

// Demo data for when database is empty
const demoStudentStats = {
  total: 247,
  active: 234,
  inactive: 13,
  newThisWeek: 12,
  averageScore: 85,
}

const demoRecentActivity = [
  {
    id: "demo-1",
    student: "Alex Johnson",
    action: "Completed Algebra worksheet",
    score: 87,
    time: "2 hours ago",
    type: "assignment" as const,
  },
  {
    id: "demo-2",
    student: "Samantha Lee",
    action: "Started Geometry practice",
    progress: 65,
    time: "3 hours ago",
    type: "practice" as const,
  },
  {
    id: "demo-3",
    student: "Michael Chen",
    action: "Asked question about quadratics",
    time: "5 hours ago",
    type: "help" as const,
  },
  {
    id: "demo-4",
    student: "Jessica Taylor",
    action: "Submitted Statistics assignment",
    score: 92,
    time: "1 day ago",
    type: "assignment" as const,
  },
]

const demoClassGroups = [
  {
    id: "demo-9a",
    name: "Class 9A",
    subject: "Maths",
    students: 28,
    averageScore: 85,
    activeAssignments: 3,
    recentTopic: "Quadratic Equations",
  },
  {
    id: "demo-9b",
    name: "Class 9B",
    subject: "Maths",
    students: 26,
    averageScore: 82,
    activeAssignments: 2,
    recentTopic: "Trigonometry",
  },
  {
    id: "demo-10a",
    name: "Class 10A",
    subject: "Maths",
    students: 24,
    averageScore: 88,
    activeAssignments: 4,
    recentTopic: "Statistics",
  },
]

export interface StudentStats {
  total: number
  active: number
  inactive: number
  newThisWeek: number
  averageScore: number
}

export interface RecentActivityItem {
  id: string
  student: string
  action: string
  score?: number
  progress?: number
  time: string
  type: "assignment" | "practice" | "help"
}

export interface ClassGroup {
  id: string
  name: string
  subject: string
  students: number
  averageScore: number
  activeAssignments: number
  recentTopic: string
}

export interface StudentsPageData {
  stats: StudentStats
  recentActivity: RecentActivityItem[]
  classGroups: ClassGroup[]
  classes: Class[]
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`
}

export default async function StudentsPage() {
  // Fetch real data
  const [classesResult, dashboardResult] = await Promise.all([
    getClassList(),
    getDashboardData(),
  ])

  const hasRealData =
    classesResult.success &&
    classesResult.data &&
    classesResult.data.length > 0 &&
    dashboardResult.success &&
    dashboardResult.data?.hasData

  let pageData: StudentsPageData
  let isDemo = false

  if (hasRealData) {
    const classes = classesResult.data!
    const dashboard = dashboardResult.data!

    // Build stats from real data
    const stats: StudentStats = {
      total: dashboard.stats.totalStudents,
      active: dashboard.stats.activeStudents,
      inactive: dashboard.stats.totalStudents - dashboard.stats.activeStudents,
      newThisWeek: 0, // Would need enrollment date tracking
      averageScore: dashboard.stats.averageScore,
    }

    // Transform recent activity from dashboard data
    const recentActivity: RecentActivityItem[] = dashboard.recentActivity
      .filter((a) => a.type === "submission")
      .slice(0, 5)
      .map((activity) => ({
        id: activity.id,
        student: activity.studentName,
        action: activity.description,
        score: activity.metadata?.score,
        time: formatTimeAgo(activity.timestamp),
        type: "assignment" as const,
      }))

    // Transform class data
    const classGroups: ClassGroup[] = dashboard.classOverview.map((cls) => ({
      id: cls.id,
      name: cls.name,
      subject: cls.subject,
      students: cls.studentCount,
      averageScore: cls.averageScore,
      activeAssignments: cls.assignmentCount,
      recentTopic: cls.subject, // Would need assignment topic tracking
    }))

    pageData = {
      stats,
      recentActivity:
        recentActivity.length > 0 ? recentActivity : demoRecentActivity,
      classGroups: classGroups.length > 0 ? classGroups : demoClassGroups,
      classes,
    }
  } else {
    isDemo = true
    pageData = {
      stats: demoStudentStats,
      recentActivity: demoRecentActivity,
      classGroups: demoClassGroups,
      classes: [],
    }
  }

  return <StudentsPageClient data={pageData} isDemo={isDemo} />
}
