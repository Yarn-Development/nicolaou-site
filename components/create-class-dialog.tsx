"use client"

import { useState } from "react"
import { createClass, type Class } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"

interface CreateClassDialogProps {
  children: React.ReactNode
}

export function CreateClassDialog({ children }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [className, setClassName] = useState("")
  const [subject, setSubject] = useState("Maths")
  const [loading, setLoading] = useState(false)
  const [createdClass, setCreatedClass] = useState<Class | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!className.trim()) {
      toast.error("CLASS NAME REQUIRED", {
        description: "Please enter a class name"
      })
      return
    }

    setLoading(true)

    try {
      const result = await createClass(className, subject)

      if (result.success && result.data) {
        setCreatedClass(result.data)
        toast.success("CLASS CREATED", {
          description: `${result.data.name} has been created successfully`
        })
      } else {
        toast.error("CREATION FAILED", {
          description: result.error || "Failed to create class"
        })
      }
    } catch (error) {
      console.error("Error creating class:", error)
      toast.error("CREATION FAILED", {
        description: "An unexpected error occurred"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (createdClass?.join_code) {
      await navigator.clipboard.writeText(createdClass.join_code)
      setCopied(true)
      toast.success("CODE COPIED", {
        description: "Join code copied to clipboard"
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset form after animation completes
    setTimeout(() => {
      setClassName("")
      setSubject("Maths")
      setCreatedClass(null)
      setCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {!createdClass ? (
          // STEP 1: Create Class Form
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-wide">
                CREATE NEW CLASS
              </DialogTitle>
              <DialogDescription>
                Create a new class and get a unique join code for your students
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="grid gap-3">
                <Label htmlFor="class-name">
                  CLASS NAME
                </Label>
                <Input
                  id="class-name"
                  placeholder="e.g., Year 10 Set 1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="subject">
                  SUBJECT
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g., Maths"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                CANCEL
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "CREATING..." : "CREATE CLASS"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // STEP 2: Show Join Code
          <div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-wide text-green-600 dark:text-green-400">
                CLASS CREATED!
              </DialogTitle>
              <DialogDescription>
                Share this join code with your students
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="grid gap-3">
                <Label>CLASS NAME</Label>
                <p className="text-lg font-semibold">{createdClass.name}</p>
              </div>

              <div className="grid gap-3">
                <Label>JOIN CODE</Label>
                <div className="relative">
                  <div className="flex items-center justify-center border-4 border-black dark:border-white bg-yellow-100 dark:bg-yellow-900/30 p-8">
                    <p className="text-5xl font-black tracking-[0.5em] font-mono">
                      {createdClass.join_code}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Students can use this code to join your class
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleClose} className="w-full">
                DONE
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
