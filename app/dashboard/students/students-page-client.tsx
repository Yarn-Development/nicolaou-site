"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StudentList } from "@/components/student-list"
import { CreateClassDialog } from "@/components/create-class-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  Download,
  Upload,
  BarChart3,
  Award,
  Clock,
  TrendingUp,
  FileText,
  Mail,
  GraduationCap,
  AlertCircle,
  Check,
  X,
} from "lucide-react"
import type { StudentsPageData } from "./page"
import { bulkInviteStudents, type InviteRow } from "@/app/actions/class-invites"

interface StudentsPageClientProps {
  data: StudentsPageData
  isDemo: boolean
}

export function StudentsPageClient({ data, isDemo }: StudentsPageClientProps) {
  const [showAddStudent, setShowAddStudent] = useState(false)

  // CSV import state
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvClassId, setCsvClassId] = useState("")
  const [csvRows, setCsvRows] = useState<InviteRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importingCsv, setImportingCsv] = useState(false)
  const [importResult, setImportResult] = useState<{
    enrolled: number; invited: number; already_enrolled: number; errors: {email: string; reason: string}[]
  } | null>(null)

  const { stats, recentActivity, classGroups, classes } = data

  const handleCsvFile = (file: File) => {
    setCsvError(null)
    setCsvRows([])
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) {
        setCsvError("CSV must have a header row and at least one student row.")
        return
      }
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim())
      const nameIdx = header.findIndex((h) => h.includes("name"))
      const emailIdx = header.findIndex((h) => h.includes("email"))
      if (emailIdx < 0) {
        setCsvError("CSV must have an 'email' column.")
        return
      }
      const rows: InviteRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        const email = cols[emailIdx] || ""
        const name = nameIdx >= 0 ? cols[nameIdx] || "" : ""
        if (email) rows.push({ email, name })
      }
      if (rows.length === 0) {
        setCsvError("No valid student rows found.")
        return
      }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (!csvClassId || csvRows.length === 0) return
    setImportingCsv(true)
    const result = await bulkInviteStudents(csvClassId, csvRows)
    setImportingCsv(false)
    if (result.success && result.data) {
      setImportResult(result.data)
      setCsvRows([])
    } else {
      setCsvError(result.error || "Import failed")
    }
  }

  const downloadCsvTemplate = () => {
    const csv = "full_name,email\nJohn Smith,john@example.com\nJane Doe,jane@example.com"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "students-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend = "neutral",
  }: {
    title: string
    value: string | number
    change?: string
    icon: React.ElementType
    trend?: "up" | "down" | "neutral"
  }) => (
    <Card className="glassmorphic">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === "up" && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            <span
              className={
                trend === "up" ? "text-green-500" : "text-muted-foreground"
              }
            >
              {change}
            </span>
            from last week
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Demo Data Banner */}
      {isDemo && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm uppercase tracking-wider">
              Demo Data
            </p>
            <p className="text-amber-700 text-xs">
              Showing sample data. Create classes and add students to see real
              statistics.
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-amber-400 text-amber-700 font-bold"
          >
            DEMO
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">
            Manage your students, track progress, and organize classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateClassDialog>
            <Button className="bg-primary hover:bg-primary/90">
              <GraduationCap className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          </CreateClassDialog>
          <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
            <DialogTrigger asChild>
              <Button variant="outline" className="glassmorphic border-muted/30">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphic border-muted/30">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Add a new student to your class. They&apos;ll receive an
                  invitation email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    placeholder="Enter student name"
                    className="glassmorphic border-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    placeholder="student@example.com"
                    className="glassmorphic border-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select>
                    <SelectTrigger className="glassmorphic border-muted/30">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length > 0 ? (
                        classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="9a">Class 9A</SelectItem>
                          <SelectItem value="9b">Class 9B</SelectItem>
                          <SelectItem value="10a">Class 10A</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddStudent(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCsvImport} onOpenChange={(v) => { setShowCsvImport(v); if (!v) { setCsvRows([]); setCsvError(null); setImportResult(null) } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="glassmorphic border-muted/30">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Import Students</DialogTitle>
                <DialogDescription>
                  Upload a CSV with columns: <code>full_name, email</code>. Students already on the platform will be enrolled directly. Others will receive an email invite.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Class selector */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Assign to class *</label>
                  <Select value={csvClassId} onValueChange={setCsvClassId}>
                    <SelectTrigger className="border">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File upload */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">CSV file *</label>
                    <button onClick={downloadCsvTemplate} className="text-xs text-blue-600 hover:underline">
                      Download template
                    </button>
                  </div>
                  <label className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
                    />
                    <div className="text-center">
                      <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload CSV</span>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                {csvRows.length > 0 && (
                  <div className="border rounded p-3 bg-muted/20">
                    <p className="text-sm font-medium mb-2">{csvRows.length} student{csvRows.length > 1 ? "s" : ""} ready to import:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {csvRows.slice(0, 10).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="font-medium">{r.name || "—"}</span>
                          <span className="text-muted-foreground">{r.email}</span>
                        </div>
                      ))}
                      {csvRows.length > 10 && (
                        <p className="text-xs text-muted-foreground">...and {csvRows.length - 10} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Result */}
                {importResult && (
                  <div className="border rounded p-3 bg-green-50 border-green-200 space-y-1">
                    <p className="text-sm font-bold text-green-800">Import complete!</p>
                    <p className="text-xs text-green-700">✓ {importResult.enrolled} enrolled immediately</p>
                    <p className="text-xs text-green-700">✉ {importResult.invited} invite emails sent</p>
                    {importResult.already_enrolled > 0 && (
                      <p className="text-xs text-muted-foreground">{importResult.already_enrolled} already enrolled (skipped)</p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        {importResult.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-600"><X className="inline h-3 w-3 mr-1" />{e.email}: {e.reason}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {csvError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />{csvError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCsvImport(false)}>Cancel</Button>
                <Button
                  onClick={handleCsvImport}
                  disabled={importingCsv || !csvClassId || csvRows.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  {importingCsv ? "Importing..." : `Import ${csvRows.length > 0 ? csvRows.length + " Students" : "Students"}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="glassmorphic border-muted/30">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.total}
          change={stats.newThisWeek > 0 ? `+${stats.newThisWeek} this week` : undefined}
          icon={Users}
          trend={stats.newThisWeek > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Active Students"
          value={stats.active}
          change={stats.active > 0 ? `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% engagement` : undefined}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Avg. Performance"
          value={`${stats.averageScore}%`}
          icon={Award}
          trend="up"
        />
        <StatCard
          title="Inactive Students"
          value={stats.inactive}
          icon={UserPlus}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-students" className="space-y-4">
        <TabsList className="glassmorphic grid w-full grid-cols-4">
          <TabsTrigger value="all-students">All Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="all-students" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Student Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classGroups.map((classGroup) => (
              <Card key={classGroup.id} className="glassmorphic">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {classGroup.name}
                    <Badge variant="secondary">
                      {classGroup.students} students
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Score</span>
                      <span className="font-bold text-primary">
                        {classGroup.averageScore}%
                      </span>
                    </div>
                    <Progress value={classGroup.averageScore} className="h-2" />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Active Assignments</span>
                      <span>{classGroup.activeAssignments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subject</span>
                      <span className="text-foreground">
                        {classGroup.subject}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 glassmorphic border-muted/30"
                    variant="outline"
                  >
                    Manage Class
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Recent Student Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 glassmorphic rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === "assignment"
                            ? "bg-primary/20 text-primary"
                            : activity.type === "practice"
                              ? "bg-secondary/20 text-secondary"
                              : "bg-accent/20 text-accent"
                        }`}
                      >
                        {activity.type === "assignment" ? (
                          <FileText className="h-4 w-4" />
                        ) : activity.type === "practice" ? (
                          <BarChart3 className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{activity.student}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {activity.score && (
                        <Badge
                          variant="outline"
                          className="text-green-500 border-green-500/50"
                        >
                          {activity.score}%
                        </Badge>
                      )}
                      {activity.progress && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={activity.progress}
                            className="w-16 h-2"
                          />
                          <span className="text-sm text-muted-foreground">
                            {activity.progress}%
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Class Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Detailed performance analytics will be displayed here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Charts showing student progress, topic mastery, and
                  comparative analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
