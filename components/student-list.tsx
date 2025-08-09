"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, Filter } from "lucide-react"

export function StudentList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSubject, setFilterSubject] = useState("all")

  const students = [
    {
      id: 1,
      name: "Alex Johnson",
      email: "alex.j@example.com",
      grade: "A",
      status: "Active",
      lastActive: "Today",
      subjects: ["Math", "Science", "English"],
    },
    {
      id: 2,
      name: "Samantha Lee",
      email: "sam.lee@example.com",
      grade: "B+",
      status: "Active",
      lastActive: "Yesterday",
      subjects: ["Math", "History", "Art"],
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "m.chen@example.com",
      grade: "A-",
      status: "Active",
      lastActive: "Today",
      subjects: ["Science", "English", "Computer Science"],
    },
    {
      id: 4,
      name: "Jessica Taylor",
      email: "j.taylor@example.com",
      grade: "B",
      status: "Inactive",
      lastActive: "3 days ago",
      subjects: ["Math", "Science", "History"],
    },
    {
      id: 5,
      name: "David Wilson",
      email: "d.wilson@example.com",
      grade: "A+",
      status: "Active",
      lastActive: "Today",
      subjects: ["Math", "Science", "Computer Science"],
    },
  ]

// Add actual filtering logic
const filteredStudents = students.filter((student) => {
  const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       student.email.toLowerCase().includes(searchTerm.toLowerCase())
  const matchesStatus = filterStatus === "all" || student.status.toLowerCase() === filterStatus
  const matchesSubject = filterSubject === "all" || student.subjects.includes(filterSubject)
  
  return matchesSearch && matchesStatus && matchesSubject
})


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students..."
            className="w-full bg-background/50 pl-8 glassmorphic border-muted/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="glassmorphic border-muted/30">
      <Filter className="mr-2 h-4 w-4" />
      Filter
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="glassmorphic border-muted/30">
    <DropdownMenuItem onClick={() => setFilterStatus("Active")}>Active Students</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setFilterStatus("Inactive")}>Inactive Students</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setFilterSubject("Math")}>Math Students</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
      </div>

      <div className="rounded-md border border-muted/30 glassmorphic">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted/30">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Subjects</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-muted/30 last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{student.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{student.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-medium ${
                        student.grade.startsWith("A")
                          ? "text-green-500"
                          : student.grade.startsWith("B")
                            ? "text-primary"
                            : "text-yellow-500"
                      }`}
                    >
                      {student.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge
                      variant="outline"
                      className={
                        student.status === "Active"
                          ? "border-green-500/50 text-green-500"
                          : "border-muted text-muted-foreground"
                      }
                    >
                      {student.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {student.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary" className="bg-secondary/20 text-secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glassmorphic border-muted/30">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuItem>View Grades</DropdownMenuItem>
                        <DropdownMenuItem>Generate Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
