"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, Users } from "lucide-react"

export interface UpcomingTask {
  id: string
  title: string
  date: string
  time: string
  type: "Grading" | "Deadline" | "Meeting" | "Preparation"
}

interface UpcomingTasksProps {
  tasks: UpcomingTask[]
}

// Demo data used when no real data is available
const demoTasks: UpcomingTask[] = [
  {
    id: "1",
    title: "Grade Math Quizzes",
    date: "Today",
    time: "2:00 PM",
    type: "Grading",
  },
  {
    id: "2",
    title: "Parent-Teacher Conference",
    date: "Tomorrow",
    time: "4:30 PM",
    type: "Meeting",
  },
  {
    id: "3",
    title: "Prepare Science Lab",
    date: "Wed, Jun 14",
    time: "9:00 AM",
    type: "Preparation",
  },
  {
    id: "4",
    title: "Department Meeting",
    date: "Thu, Jun 15",
    time: "1:00 PM",
    type: "Meeting",
  },
  {
    id: "5",
    title: "Submit Term Reports",
    date: "Fri, Jun 16",
    time: "5:00 PM",
    type: "Deadline",
  },
]

function getTaskIcon(type: UpcomingTask["type"]) {
  switch (type) {
    case "Meeting":
      return <Users className="h-4 w-4" />
    case "Grading":
    case "Deadline":
    case "Preparation":
    default:
      return <FileText className="h-4 w-4" />
  }
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  // Use demo data if no tasks provided
  const displayTasks = tasks.length > 0 ? tasks : demoTasks
  const isDemo = tasks.length === 0

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded-md inline-block mb-2">
          Demo Data
        </div>
      )}
      {displayTasks.map((task) => (
        <div key={task.id} className="flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-muted/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            {getTaskIcon(task.type)}
          </div>
          <div className="space-y-1">
            <p className="font-medium leading-none">{task.title}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              <span>{task.date}</span>
              <span className="mx-1">•</span>
              <Clock className="mr-1 h-3 w-3" />
              <span>{task.time}</span>
            </div>
          </div>
          <div className="ml-auto">
            <Badge
              variant="outline"
              className={
                task.type === "Grading"
                  ? "border-primary/50 text-primary"
                  : task.type === "Meeting"
                    ? "border-secondary/50 text-secondary"
                    : task.type === "Deadline"
                      ? "border-destructive/50 text-destructive"
                      : "border-accent/50 text-accent"
              }
            >
              {task.type}
            </Badge>
          </div>
        </div>
      ))}
      {displayTasks.length === 0 && !isDemo && (
        <div className="text-center text-muted-foreground py-8">
          No upcoming tasks. Check back later!
        </div>
      )}
    </div>
  )
}
