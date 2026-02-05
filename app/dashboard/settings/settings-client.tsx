"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { seedDemoData, removeDemoData, checkDemoDataExists } from "@/app/actions/demo-data"
import { Loader2, Users, FileText, CheckCircle, AlertCircle, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"

export function SettingsClient() {
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [checking, setChecking] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    classId?: string
    assignmentId?: string
    studentCount?: number
  } | null>(null)
  const [demoExists, setDemoExists] = useState<{
    exists: boolean
    classId?: string
    assignmentId?: string
  }>({ exists: false })

  // Check if demo data exists on mount
  useEffect(() => {
    async function checkExists() {
      const status = await checkDemoDataExists()
      setDemoExists(status)
      setChecking(false)
    }
    checkExists()
  }, [])

  const handleSeedDemoData = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await seedDemoData()

      if (response.success && response.data) {
        setResult({
          success: true,
          message: response.alreadySeeded
            ? "Demo data already exists!"
            : `Successfully created demo class with ${response.data.studentCount} students!`,
          classId: response.data.classId,
          assignmentId: response.data.assignmentId,
          studentCount: response.data.studentCount,
        })
        setDemoExists({
          exists: true,
          classId: response.data.classId,
          assignmentId: response.data.assignmentId,
        })
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to seed demo data",
        })
      }
    } catch {
      setResult({
        success: false,
        message: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDemoData = async () => {
    if (!confirm("Are you sure you want to remove all demo data? This cannot be undone.")) {
      return
    }

    setRemoving(true)
    setResult(null)

    try {
      const response = await removeDemoData()

      if (response.success) {
        setResult({
          success: true,
          message: "Demo data has been removed successfully.",
        })
        setDemoExists({ exists: false })
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to remove demo data",
        })
      }
    } catch {
      setResult({
        success: false,
        message: "An unexpected error occurred",
      })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Demo Onboarding Section */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">
                Demo Onboarding
              </CardTitle>
              <CardDescription className="mt-2">
                Create sample data to explore the marking and feedback workflow
              </CardDescription>
            </div>
            {!checking && demoExists.exists && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                Demo Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* What gets created */}
          <div className="bg-swiss-concrete/50 p-4 border-2 border-swiss-lead/20">
            <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead mb-3">
              What gets created:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-swiss-signal" />
                <span>A demo class &quot;Year 13 Demo&quot; with 5 fake students</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-swiss-signal" />
                <span>A mock exam assignment with 8 questions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-swiss-signal" />
                <span>Graded submissions with realistic score variation</span>
              </li>
            </ul>
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`p-4 border-2 flex items-start gap-3 ${
                result.success
                  ? "border-green-500 bg-green-50 text-green-800"
                  : "border-red-500 bg-red-50 text-red-800"
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{result.success ? "Success" : "Error"}</p>
                <p className="text-sm mt-1">{result.message}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {checking ? (
              <Button disabled className="border-2 border-swiss-ink">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </Button>
            ) : demoExists.exists ? (
              <>
                {/* Quick Links */}
                <div className="flex gap-2">
                  {demoExists.assignmentId && (
                    <Link href={`/dashboard/assignments/${demoExists.assignmentId}/mark`}>
                      <Button variant="outline" className="border-2 border-swiss-ink">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Go to Marking Grid
                      </Button>
                    </Link>
                  )}
                  <Link href="/dashboard/students">
                    <Button variant="outline" className="border-2 border-swiss-ink">
                      <Users className="mr-2 h-4 w-4" />
                      View Demo Students
                    </Button>
                  </Link>
                </div>

                {/* Remove Demo Data */}
                <Button
                  variant="destructive"
                  onClick={handleRemoveDemoData}
                  disabled={removing}
                  className="ml-auto"
                >
                  {removing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove Demo Data
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSeedDemoData}
                disabled={loading}
                className="bg-swiss-signal hover:bg-swiss-signal/90 text-white border-2 border-swiss-signal"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Demo Data...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Seed Demo Data
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Instructions */}
          {demoExists.exists && (
            <div className="text-sm text-swiss-lead bg-swiss-concrete/30 p-4 border border-swiss-lead/20">
              <p className="font-bold mb-2">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Visit the <strong>Marking Grid</strong> to see student scores</li>
                <li>Click <strong>Generate Feedback</strong> to create personalized feedback</li>
                <li>Release feedback and view <strong>RAG Analysis</strong></li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Settings Placeholder */}
      <Card className="border-2 border-swiss-lead/30">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-swiss-lead">
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your account preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-swiss-lead">
            Account settings coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
