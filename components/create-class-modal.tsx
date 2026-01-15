"use client"

import { useState } from "react"
import { createClass, type Class } from "@/app/actions/classes"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Copy, Check } from "lucide-react"

export function CreateClassModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdClass, setCreatedClass] = useState<Class | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "Maths",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createClass(formData.name, formData.subject)

    if (result.success && result.data) {
      setCreatedClass(result.data)
      setFormData({ name: "", subject: "Maths" })
    } else {
      setError(result.error || "Failed to create class")
    }

    setLoading(false)
  }

  const handleClose = () => {
    setOpen(false)
    setCreatedClass(null)
    setError(null)
    setCopied(false)
  }

  const handleCopyCode = async () => {
    if (createdClass?.join_code) {
      await navigator.clipboard.writeText(createdClass.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      setOpen(isOpen)
    }}>
      <DialogTrigger asChild>
        <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink">
          <Plus className="w-4 h-4 mr-2" />
          Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-swiss-paper border-2 border-swiss-ink max-w-md">
        <DialogHeader className="border-b-2 border-swiss-ink pb-4">
          <DialogTitle className="font-black uppercase tracking-tight text-swiss-ink text-xl">
            {createdClass ? "Class Created!" : "Create New Class"}
          </DialogTitle>
          <DialogDescription className="text-swiss-lead font-medium text-sm">
            {createdClass 
              ? "Share this code with your students" 
              : "Create a new class and get a unique join code"}
          </DialogDescription>
        </DialogHeader>

        {createdClass ? (
          // Success State - Show Join Code
          <div className="space-y-6 py-4">
            <div className="border-2 border-swiss-ink bg-swiss-concrete p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-3">
                Join Code
              </p>
              <div className="text-5xl font-black tracking-widest text-swiss-ink mb-4">
                {createdClass.join_code}
              </div>
              <Button
                onClick={handleCopyCode}
                className="w-full bg-swiss-ink hover:bg-swiss-ink/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-swiss-ink pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold uppercase tracking-wider text-swiss-lead">Class Name:</span>
                  <span className="text-swiss-ink font-medium">{createdClass.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold uppercase tracking-wider text-swiss-lead">Subject:</span>
                  <span className="text-swiss-ink font-medium">{createdClass.subject}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-swiss-concrete hover:bg-swiss-lead/10 text-swiss-ink font-bold uppercase tracking-wider border-2 border-swiss-ink"
            >
              Done
            </Button>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Class Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Year 10 - Set 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-2 border-swiss-ink bg-swiss-paper text-swiss-ink font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Subject
                </Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maths">Maths</SelectItem>
                    <SelectItem value="Further Maths">Further Maths</SelectItem>
                    <SelectItem value="Statistics">Statistics</SelectItem>
                    <SelectItem value="Mechanics">Mechanics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="border-2 border-swiss-signal bg-swiss-signal/10 p-3">
                <p className="text-xs font-bold text-swiss-signal uppercase tracking-wider">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3">
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
                disabled={loading || !formData.name.trim()}
                className="flex-1 bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
