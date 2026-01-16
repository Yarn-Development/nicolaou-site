import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getStudentDashboardData } from "@/app/actions/feedback"

interface Props {
  params: Promise<{
    studentId: string
  }>
}

// Mock attendance data (will be replaced with real data later)
const MOCK_ATTENDANCE = {
  totalDays: 85,
  presentDays: 81,
  lateDays: 3,
  absentDays: 1,
  percentage: 95.3,
}

export default async function ParentReportPage({ params }: Props) {
  const { studentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get student profile
  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", studentId)
    .single()

  if (!student) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Student not found</h1>
      </div>
    )
  }

  // Get dashboard data (using server-side call)
  // Note: This requires the teacher to be logged in or the student themselves
  const result = await getStudentDashboardData()
  
  const studentName = student.full_name || student.email.split("@")[0]
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Calculate summary stats
  const stats = result.success && result.data?.overallStats 
    ? result.data.overallStats 
    : {
        completedAssignments: 0,
        totalAssignments: 0,
        averageScore: 0,
        bestTopic: null,
        weakestTopic: null,
      }

  const topicMastery = result.success && result.data?.topicMastery 
    ? result.data.topicMastery 
    : []

  const assignments = result.success && result.data?.assignments
    ? result.data.assignments
    : []

  // Get RAG status
  const getRAG = (percentage: number) => {
    if (percentage >= 70) return { label: "Strong", color: "#22c55e", bg: "#dcfce7" }
    if (percentage >= 40) return { label: "Developing", color: "#eab308", bg: "#fef9c3" }
    return { label: "Needs Support", color: "#ef4444", bg: "#fee2e2" }
  }

  const overallRAG = getRAG(stats.averageScore)
  const attendanceRAG = getRAG(MOCK_ATTENDANCE.percentage)

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-6">
      {/* Header */}
      <header className="border-b-4 border-black pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1">
              STUDENT PROGRESS REPORT
            </h1>
            <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Academic Performance Summary
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-500">Report Date:</p>
            <p className="text-lg font-black">{generatedDate}</p>
          </div>
        </div>
      </header>

      {/* Student Info */}
      <section className="mb-8 grid grid-cols-2 gap-6">
        <div className="border-2 border-black p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            STUDENT NAME
          </p>
          <p className="text-2xl font-black uppercase">{studentName}</p>
          <p className="text-sm text-gray-500 mt-1">{student.email}</p>
        </div>
        
        <div 
          className="border-2 border-black p-6"
          style={{ backgroundColor: overallRAG.bg }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            OVERALL STATUS
          </p>
          <p 
            className="text-2xl font-black uppercase"
            style={{ color: overallRAG.color }}
          >
            {overallRAG.label}
          </p>
          <p className="text-4xl font-black mt-2" style={{ color: overallRAG.color }}>
            {stats.averageScore}%
          </p>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="mb-8">
        <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
          Key Statistics
        </h2>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="border-2 border-black p-4 text-center">
            <p className="text-3xl font-black text-swiss-ink">
              {stats.completedAssignments}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Completed
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-3xl font-black text-swiss-ink">
              {stats.totalAssignments}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Total Assigned
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-3xl font-black" style={{ color: overallRAG.color }}>
              {stats.averageScore}%
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Average Score
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-3xl font-black text-swiss-ink">
              {stats.totalAssignments > 0 
                ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100) 
                : 0}%
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Completion Rate
            </p>
          </div>
        </div>
      </section>

      {/* Attendance (Mock Data) */}
      <section className="mb-8">
        <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
          Attendance Record
        </h2>
        
        <div className="grid grid-cols-5 gap-4">
          <div 
            className="border-2 border-black p-4 text-center col-span-1"
            style={{ backgroundColor: attendanceRAG.bg }}
          >
            <p className="text-3xl font-black" style={{ color: attendanceRAG.color }}>
              {MOCK_ATTENDANCE.percentage}%
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Attendance
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-2xl font-black text-green-600">{MOCK_ATTENDANCE.presentDays}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Present
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-2xl font-black text-amber-600">{MOCK_ATTENDANCE.lateDays}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Late
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-2xl font-black text-red-600">{MOCK_ATTENDANCE.absentDays}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              Absent
            </p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-2xl font-black text-gray-600">{MOCK_ATTENDANCE.totalDays}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">
              School Days
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400 mt-2 italic">
          * Attendance data shown is for demonstration purposes
        </p>
      </section>

      {/* Topic Performance */}
      {topicMastery.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
            Topic Performance
          </h2>
          
          <div className="space-y-3">
            {topicMastery.map((topic) => {
              const rag = getRAG(topic.percentage)
              return (
                <div key={topic.topic} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider truncate">
                      {topic.topic}
                    </p>
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 border border-gray-300 relative">
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        width: `${topic.percentage}%`,
                        backgroundColor: rag.color 
                      }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <span className="font-black" style={{ color: rag.color }}>
                      {topic.percentage}%
                    </span>
                  </div>
                  <div className="w-24">
                    <span 
                      className="text-xs font-bold uppercase px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: rag.bg,
                        color: rag.color 
                      }}
                    >
                      {rag.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent Assignments */}
      {assignments.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
            Recent Assignments
          </h2>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left text-xs font-black uppercase tracking-wider py-2">
                  Assignment
                </th>
                <th className="text-left text-xs font-black uppercase tracking-wider py-2">
                  Class
                </th>
                <th className="text-center text-xs font-black uppercase tracking-wider py-2">
                  Score
                </th>
                <th className="text-center text-xs font-black uppercase tracking-wider py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.slice(0, 10).map((assignment) => {
                const rag = assignment.percentage !== null 
                  ? getRAG(assignment.percentage) 
                  : { label: "Pending", color: "#6b7280", bg: "#f3f4f6" }
                
                return (
                  <tr key={assignment.id} className="border-b border-gray-200">
                    <td className="py-2 text-sm font-medium">{assignment.title}</td>
                    <td className="py-2 text-sm text-gray-500">{assignment.className}</td>
                    <td className="py-2 text-center">
                      {assignment.percentage !== null ? (
                        <span className="font-black" style={{ color: rag.color }}>
                          {assignment.percentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <span 
                        className="text-xs font-bold uppercase px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: rag.bg,
                          color: rag.color 
                        }}
                      >
                        {assignment.status === "graded" ? rag.label : 
                         assignment.status === "submitted" ? "Submitted" : "Pending"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Summary & Recommendations */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
          Summary & Recommendations
        </h2>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="border-2 border-green-500 bg-green-50 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-green-700 mb-3">
              Strengths
            </h3>
            {stats.bestTopic ? (
              <p className="text-sm text-green-800">
                {studentName} shows strong performance in <strong>{stats.bestTopic}</strong>. 
                Continue to challenge with more advanced problems in this area.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Complete more assignments to identify strengths.
              </p>
            )}
          </div>
          
          {/* Areas for Improvement */}
          <div className="border-2 border-amber-500 bg-amber-50 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-700 mb-3">
              Areas for Improvement
            </h3>
            {stats.weakestTopic ? (
              <p className="text-sm text-amber-800">
                Additional practice in <strong>{stats.weakestTopic}</strong> would be beneficial. 
                Consider targeted revision exercises in this topic.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Complete more assignments to identify areas for improvement.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <p className="font-bold uppercase tracking-widest">
            Student Progress Report • {studentName}
          </p>
          <p>
            Generated {generatedDate}
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            This report provides a summary of academic performance and attendance. 
            For detailed feedback, please contact the class teacher.
          </p>
        </div>
      </footer>
    </div>
  )
}
