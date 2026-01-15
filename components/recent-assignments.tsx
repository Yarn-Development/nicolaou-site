import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ClipboardCheck } from "lucide-react"

export interface RecentAssignment {
  id: string
  title: string
  className: string
  dueDate: string | null
  status: "Active" | "Completed"
  submitted: number
  total: number
}

interface RecentAssignmentsProps {
  assignments: RecentAssignment[]
  isTeacher?: boolean
}

// Demo data used when no real data is available
const demoAssignments: RecentAssignment[] = [
  {
    id: "demo-1",
    title: "Algebra Quiz",
    className: "Mathematics",
    dueDate: "2024-06-12",
    submitted: 24,
    total: 28,
    status: "Active",
  },
  {
    id: "demo-2",
    title: "Chemical Reactions Lab",
    className: "Science",
    dueDate: "2024-06-10",
    submitted: 26,
    total: 28,
    status: "Active",
  },
  {
    id: "demo-3",
    title: "Essay: Modern Literature",
    className: "English",
    dueDate: "2024-06-08",
    submitted: 28,
    total: 28,
    status: "Completed",
  },
  {
    id: "demo-4",
    title: "World War II Analysis",
    className: "History",
    dueDate: "2024-06-05",
    submitted: 27,
    total: 28,
    status: "Completed",
  },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RecentAssignments({ assignments, isTeacher = true }: RecentAssignmentsProps) {
  // Use demo data if no assignments provided
  const displayAssignments = assignments.length > 0 ? assignments : demoAssignments
  const isDemo = assignments.length === 0

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded-md inline-block mb-2">
          Demo Data
        </div>
      )}
      {displayAssignments.map((assignment) => (
        <div key={assignment.id} className="flex flex-col space-y-2 rounded-md p-3 transition-all hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{assignment.title}</p>
              <p className="text-sm text-muted-foreground">{assignment.className}</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  assignment.status === "Active" ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-500"
                }`}
              >
                {assignment.status}
              </div>
              {/* Grade Button for Teachers */}
              {isTeacher && !isDemo && (
                <Link href={`/dashboard/assignments/${assignment.id}/mark`}>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-2 border-swiss-ink font-bold uppercase text-xs h-7 px-2"
                  >
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    Grade
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Due: {formatDate(assignment.dueDate)}</div>
            <div>
              <span className="font-medium">{assignment.submitted}</span>
              <span className="text-muted-foreground">/{assignment.total} submitted</span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full"
              style={{
                width: `${assignment.total > 0 ? (assignment.submitted / assignment.total) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      ))}
      {displayAssignments.length === 0 && !isDemo && (
        <div className="text-center text-muted-foreground py-8">
          No assignments yet. Create your first assignment to get started.
        </div>
      )}
    </div>
  )
}
