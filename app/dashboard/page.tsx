import { TeacherDashboard } from "@/components/teacher-dashboard"
import { 
  getDashboardData, 
  getPerformanceData,
  getRecentAssignments,
  getUpcomingTasks,
  type DashboardData,
} from "@/app/actions/dashboard"

// Demo data for when database is empty or user not logged in
const demoData: DashboardData = {
  stats: {
    totalStudents: 128,
    activeStudents: 98,
    totalClasses: 6,
    pendingAssignments: 24,
    needsGrading: 8,
    averageScore: 78,
    studentChange: 4,
    classChange: 0,
    scoreChange: 2.5,
  },
  recentActivity: [
    {
      id: "demo-1",
      type: "submission",
      studentName: "Emma Wilson",
      studentEmail: "emma.w@school.edu",
      description: "Submitted: Quadratic Equations Quiz",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { assignmentTitle: "Quadratic Equations Quiz" },
    },
    {
      id: "demo-2",
      type: "submission",
      studentName: "James Chen",
      studentEmail: "james.c@school.edu",
      description: "Graded: Probability Test",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      metadata: { score: 85, assignmentTitle: "Probability Test" },
    },
    {
      id: "demo-3",
      type: "enrollment",
      studentName: "Sophie Brown",
      studentEmail: "sophie.b@school.edu",
      description: "Joined: Year 11 Higher",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      metadata: { className: "Year 11 Higher" },
    },
  ],
  classOverview: [
    {
      id: "demo-class-1",
      name: "Year 11 Higher",
      subject: "Maths",
      studentCount: 28,
      assignmentCount: 12,
      averageScore: 76,
      recentActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-class-2",
      name: "Year 10 Foundation",
      subject: "Maths",
      studentCount: 32,
      assignmentCount: 8,
      averageScore: 68,
      recentActivity: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-class-3",
      name: "Year 11 Foundation",
      subject: "Maths",
      studentCount: 30,
      assignmentCount: 10,
      averageScore: 72,
      recentActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  hasData: true,
}

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [dashboardResult, performanceResult, assignmentsResult, tasksResult] = await Promise.all([
    getDashboardData(),
    getPerformanceData(),
    getRecentAssignments(),
    getUpcomingTasks(),
  ])

  // Determine if we should show demo data
  const showDemoData = !dashboardResult.success || !dashboardResult.data?.hasData
  const data = showDemoData ? demoData : dashboardResult.data!
  
  // Use real data if available, empty arrays otherwise (components will show demo data)
  const performanceData = performanceResult.success ? performanceResult.data || [] : []
  const recentAssignments = assignmentsResult.success ? assignmentsResult.data || [] : []
  const upcomingTasks = tasksResult.success ? tasksResult.data || [] : []

  return (
    <TeacherDashboard 
      data={data} 
      isDemo={showDemoData}
      performanceData={performanceData}
      recentAssignments={recentAssignments}
      upcomingTasks={upcomingTasks}
    />
  )
}
