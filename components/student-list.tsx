"use client"

import { useState, useMemo, useEffect } from "react"
import { getClassList, getClassStudents, removeStudentFromClass, type Class, type ClassStudent } from "@/app/actions/classes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, Users, Trash2 } from "lucide-react"
import { CreateClassModal } from "./create-class-modal"

export function StudentList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)

  // Fetch teacher's classes on mount
  useEffect(() => {
    fetchClasses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch students when class selection changes
  useEffect(() => {
    if (selectedClassId && selectedClassId !== "all") {
      fetchStudents(selectedClassId)
    } else {
      setStudents([])
    }
  }, [selectedClassId])

  const fetchClasses = async () => {
    setLoading(true)
    const result = await getClassList()
    if (result.success && result.data) {
      setClasses(result.data)
      // Auto-select first class if available
      if (result.data.length > 0 && selectedClassId === "all") {
        setSelectedClassId(result.data[0].id)
      }
    }
    setLoading(false)
  }

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true)
    const result = await getClassStudents(classId)
    if (result.success && result.data) {
      setStudents(result.data)
    }
    setLoadingStudents(false)
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClassId || selectedClassId === "all") return
    
    if (!confirm("Are you sure you want to remove this student from the class?")) {
      return
    }

    setRemovingStudent(studentId)
    const result = await removeStudentFromClass(selectedClassId, studentId)
    
    if (result.success) {
      // Refresh student list
      fetchStudents(selectedClassId)
      // Refresh class list to update student counts
      fetchClasses()
    }
    
    setRemovingStudent(null)
  }

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = 
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [students, searchTerm])

  const selectedClass = classes.find(c => c.id === selectedClassId)

  return (
    <div className="space-y-6">
      {/* Header with Create Class Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-swiss-ink">
            Student Management
          </h3>
          <p className="text-sm text-swiss-lead font-medium">
            Manage students across your classes
          </p>
        </div>
        <CreateClassModal />
      </div>

      {/* Class Selector */}
      <div className="border-2 border-swiss-ink bg-swiss-concrete p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-swiss-ink">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Select Class:</span>
          </div>
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={loading}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select a class..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.subject} ({cls.student_count || 0} students)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClass && (
            <Badge className="bg-swiss-signal text-swiss-paper font-bold uppercase tracking-wider">
              {selectedClass.join_code}
            </Badge>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-swiss-lead" />
          <Input
            type="search"
            placeholder="Search students..."
            className="w-full bg-swiss-paper border-2 border-swiss-ink pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
          {filteredStudents.length} {filteredStudents.length === 1 ? "Student" : "Students"}
        </div>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider">Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider mb-4">
            No classes yet
          </p>
          <p className="text-sm text-swiss-lead mb-6">
            Create your first class to start managing students
          </p>
          <CreateClassModal />
        </div>
      ) : selectedClassId === "all" ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider">
            Select a class to view students
          </p>
        </div>
      ) : loadingStudents ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider mb-2">
            No students yet
          </p>
          <p className="text-sm text-swiss-lead">
            Share your class code <span className="font-black text-swiss-signal">{selectedClass?.join_code}</span> with students to get started
          </p>
        </div>
      ) : (
        <div className="border-2 border-swiss-ink bg-swiss-paper">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-swiss-ink bg-swiss-concrete">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="border-b border-swiss-ink last:border-0 hover:bg-swiss-concrete transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-swiss-ink">
                      {student.full_name || "No name set"}
                    </td>
                    <td className="px-4 py-3 text-sm text-swiss-lead">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-swiss-lead">
                      {new Date(student.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-swiss-concrete"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleRemoveStudent(student.id)}
                            disabled={removingStudent === student.id}
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {removingStudent === student.id ? "Removing..." : "Remove from Class"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
