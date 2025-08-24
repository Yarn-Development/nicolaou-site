export function RecentAssignments() {
  const assignments = [
    {
      id: 1,
      title: "Algebra Quiz",
      subject: "Mathematics",
      assigned: "Jun 5, 2023",
      due: "Jun 12, 2023",
      submitted: 24,
      total: 28,
      status: "Active",
    },
    {
      id: 2,
      title: "Chemical Reactions Lab",
      subject: "Science",
      assigned: "Jun 3, 2023",
      due: "Jun 10, 2023",
      submitted: 26,
      total: 28,
      status: "Active",
    },
    {
      id: 3,
      title: "Essay: Modern Literature",
      subject: "English",
      assigned: "May 28, 2023",
      due: "Jun 8, 2023",
      submitted: 28,
      total: 28,
      status: "Completed",
    },
    {
      id: 4,
      title: "World War II Analysis",
      subject: "History",
      assigned: "May 25, 2023",
      due: "Jun 5, 2023",
      submitted: 27,
      total: 28,
      status: "Completed",
    },
  ]

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="flex flex-col space-y-2 rounded-md p-3 transition-all hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{assignment.title}</p>
              <p className="text-sm text-muted-foreground">{assignment.subject}</p>
            </div>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                assignment.status === "Active" ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-500"
              }`}
            >
              {assignment.status}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Due: {assignment.due}</div>
            <div>
              <span className="font-medium">{assignment.submitted}</span>
              <span className="text-muted-foreground">/{assignment.total} submitted</span>
            </div>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full"
              style={{
                width: `${(assignment.submitted / assignment.total) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  )
}
