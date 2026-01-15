"use client"

import { useState, useEffect } from "react"
import { createAssignment, type Assignment } from "@/app/actions/assignments"
import { getClassList, type Class } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Check, FileText } from "lucide-react"

interface CreateAssignmentModalProps {
  onCreated?: (assignment: Assignment) => void
  preselectedClassId?: string
}

export function CreateAssignmentModal({ onCreated, preselectedClassId }: CreateAssignmentModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  
  const [formData, setFormData] = useState({
    classId: preselectedClassId || "",
    title: "",
    description: "",
    dueDate: "",
    status: "draft" as "draft" | "published",
  })

  useEffect(() => {
    if (open) {
      fetchClasses()
    }
  }, [open])

  useEffect(() => {
    if (preselectedClassId) {
      setFormData(prev => ({ ...prev, classId: preselectedClassId }))
    }
  }, [preselectedClassId])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    const result = await getClassList()
    if (result.success && result.data) {
      setClasses(result.data)
      // Auto-select first class if none preselected
      if (!formData.classId && result.data.length > 0) {
        setFormData(prev => ({ ...prev, classId: result.data![0].id }))
      }
    }
    setLoadingClasses(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createAssignment(
      formData.classId,
      formData.title,
      { description: formData.description },
      { 
        dueDate: formData.dueDate || undefined,
        status: formData.status 
      }
    )

    if (result.success && result.data) {
      setSuccess(true)
      onCreated?.(result.data)
      // Auto-close after showing success
      setTimeout(() => {
        handleClose()
      }, 1500)
    } else {
      setError(result.error || "Failed to create assignment")
    }

    setLoading(false)
  }

  const handleClose = () => {
    setOpen(false)
    setSuccess(false)
    setError(null)
    setFormData({
      classId: preselectedClassId || "",
      title: "",
      description: "",
      dueDate: "",
      status: "draft",
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      setOpen(isOpen)
    }}>
      <DialogTrigger asChild>
        <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink">
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-swiss-paper border-2 border-swiss-ink max-w-lg">
        <DialogHeader className="border-b-2 border-swiss-ink pb-4">
          <DialogTitle className="font-black uppercase tracking-tight text-swiss-ink text-xl">
            {success ? "Assignment Created!" : "Create New Assignment"}
          </DialogTitle>
          <DialogDescription className="text-swiss-lead font-medium text-sm">
            {success 
              ? "Your assignment has been saved" 
              : "Create a new assignment for your class"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          // Success State
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto bg-swiss-signal/10 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-swiss-signal" />
            </div>
            <p className="text-swiss-ink font-bold uppercase tracking-wider">
              Assignment Created Successfully
            </p>
            <p className="text-swiss-lead text-sm mt-2">
              {formData.status === "published" ? "Students can now see this assignment" : "Save as draft - publish when ready"}
            </p>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            {/* Class Selector */}
            <div className="space-y-2">
              <Label htmlFor="class" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Class
              </Label>
              {loadingClasses ? (
                <div className="h-10 bg-swiss-concrete animate-pulse border-2 border-swiss-ink" />
              ) : classes.length === 0 ? (
                <div className="border-2 border-swiss-signal bg-swiss-signal/10 p-3">
                  <p className="text-xs font-bold text-swiss-signal uppercase tracking-wider">
                    No classes found. Create a class first.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
                  disabled={!!preselectedClassId}
                >
                  <SelectTrigger id="class" className="w-full border-2 border-swiss-ink">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Assignment Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Algebra Quiz - Week 3"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="border-2 border-swiss-ink bg-swiss-paper text-swiss-ink font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Instructions for students..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-2 border-swiss-ink bg-swiss-paper text-swiss-ink font-medium min-h-[80px]"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Due Date (Optional)
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="border-2 border-swiss-ink bg-swiss-paper text-swiss-ink font-medium"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Status
              </Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "draft" })}
                  className={`flex-1 font-bold uppercase tracking-wider border-2 border-swiss-ink ${
                    formData.status === "draft"
                      ? "bg-swiss-ink text-swiss-paper"
                      : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "published" })}
                  className={`flex-1 font-bold uppercase tracking-wider border-2 border-swiss-ink ${
                    formData.status === "published"
                      ? "bg-swiss-signal text-swiss-paper"
                      : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
                  }`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Published
                </Button>
              </div>
              <p className="text-xs text-swiss-lead">
                {formData.status === "draft" 
                  ? "Draft assignments are only visible to you" 
                  : "Published assignments are visible to enrolled students"}
              </p>
            </div>

            {error && (
              <div className="border-2 border-swiss-signal bg-swiss-signal/10 p-3">
                <p className="text-xs font-bold text-swiss-signal uppercase tracking-wider">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-swiss-concrete hover:bg-swiss-lead/10 text-swiss-ink font-bold uppercase tracking-wider border-2 border-swiss-ink"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.classId || !formData.title.trim() || classes.length === 0}
                className="flex-1 bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
