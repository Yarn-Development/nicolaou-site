"use client"

import { useState } from "react"
import { joinClass } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Check } from "lucide-react"

export function JoinClassCard() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ name: string; subject: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await joinClass(code)

    if (result.success && result.data) {
      setSuccess(result.data)
      setCode("")
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error || "Failed to join class")
    }

    setLoading(false)
  }

  return (
    <Card className="bg-swiss-paper border-2 border-swiss-ink">
      <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-swiss-ink" />
          <div>
            <CardTitle className="font-black uppercase tracking-tight text-swiss-ink">
              Join a Class
            </CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
              Enter your teacher&apos;s class code
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code" className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              6-Character Code
            </Label>
            <Input
              id="join-code"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="border-2 border-swiss-ink bg-swiss-paper text-swiss-ink font-bold text-lg tracking-widest text-center uppercase"
              required
            />
            <p className="text-xs text-swiss-lead">
              Ask your teacher for the class code
            </p>
          </div>

          {error && (
            <div className="border-2 border-swiss-signal bg-swiss-signal/10 p-3">
              <p className="text-xs font-bold text-swiss-signal uppercase tracking-wider">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="border-2 border-green-600 bg-green-50 dark:bg-green-950 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
                  Successfully Joined!
                </p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400">
                {success.name} ({success.subject})
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-swiss-ink hover:bg-swiss-ink/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Class"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
