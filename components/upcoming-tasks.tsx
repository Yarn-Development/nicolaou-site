"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, Users } from "lucide-react"

export function UpcomingTasks() {
  const tasks = [
    {
      id: 1,
      title: "Grade Math Quizzes",
      date: "Today",
      time: "2:00 PM",
      type: "Grading",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: 2,
      title: "Parent-Teacher Conference",
      date: "Tomorrow",
      time: "4:30 PM",
      type: "Meeting",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 3,
      title: "Prepare Science Lab",
      date: "Wed, Jun 14",
      time: "9:00 AM",
      type: "Preparation",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: 4,
      title: "Department Meeting",
      date: "Thu, Jun 15",
      time: "1:00 PM",
      type: "Meeting",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 5,
      title: "Submit Term Reports",
      date: "Fri, Jun 16",
      time: "5:00 PM",
      type: "Deadline",
      icon: <FileText className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-muted/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{task.icon}</div>
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
    </div>
  )
}
