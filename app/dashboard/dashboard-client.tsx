"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlusCircle,
  Sparkles,
  UploadCloud,
  ClipboardCheck,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  PartyPopper,
} from "lucide-react"
import type { AssignmentAction, RecentAssignmentActivity } from "@/app/actions/dashboard"

interface DashboardClientProps {
  actionQueue: AssignmentAction[]
  recentActivity: RecentAssignmentActivity[]
}

export function DashboardClient({ actionQueue, recentActivity }: DashboardClientProps) {
  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="border-b-2 border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Command Bar - Quick Actions */}
      <section>
        <h2 className="swiss-label text-muted-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {/* New Assignment */}
          <Link href="/dashboard/assignments/create">
            <Card className="border-2 border-border hover:border-primary transition-colors cursor-pointer h-full group">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      New Assignment
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Create a quiz or exam paper
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Shadow Paper */}
          <Link href="/dashboard/ingest?mode=shadow">
            <Card className="border-2 border-border hover:border-primary transition-colors cursor-pointer h-full group">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Shadow Paper
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Clone a past paper with AI
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Upload & Digitize */}
          <Link href="/dashboard/ingest?mode=digitize">
            <Card className="border-2 border-border hover:border-primary transition-colors cursor-pointer h-full group">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Digitize Paper
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Upload & auto-map questions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      {/* Action Queue - Requires Attention */}
      <section>
        <h2 className="swiss-label text-muted-foreground mb-4">
          Requires Attention
        </h2>
        <Card className="border-2 border-border">
          <CardContent className="p-0">
            {actionQueue.length === 0 ? (
              /* Empty State */
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-muted text-muted-foreground mb-4 mx-auto">
                  <PartyPopper className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold mb-1">All caught up</h3>
                <p className="text-sm text-muted-foreground">
                  No assignments need your attention right now.
                </p>
              </div>
            ) : (
              /* Action Items */
              <div className="divide-y divide-border">
                {actionQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 ${
                        item.status === "needs_grading"
                          ? "bg-primary text-white"
                          : "bg-muted text-foreground"
                      }`}>
                        {item.status === "needs_grading" ? (
                          <ClipboardCheck className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.className} &middot;{" "}
                          {item.status === "needs_grading" ? (
                            <span className="text-primary font-medium">
                              {item.needsGrading} to mark
                            </span>
                          ) : (
                            <span className="font-medium">
                              {item.gradedCount} graded, ready for feedback
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/assignments/${item.id}/mark`}>
                      <Button
                        size="sm"
                        variant={item.status === "needs_grading" ? "default" : "outline"}
                        className="shrink-0"
                      >
                        {item.status === "needs_grading" ? "Mark Now" : "Release Feedback"}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="swiss-label text-muted-foreground mb-4">
          Recent Activity
        </h2>
        <Card className="border-2 border-border">
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              /* Empty State */
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-muted text-muted-foreground mb-4 mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold mb-1">No assignments yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first assignment to get started.
                </p>
                <Link href="/dashboard/assignments/create">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Assignment
                  </Button>
                </Link>
              </div>
            ) : (
              /* Activity List */
              <div className="divide-y divide-border">
                {recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/assignments/${item.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.className}
                          {item.submissionCount > 0 && (
                            <> &middot; {item.submissionCount} submission{item.submissionCount !== 1 ? "s" : ""}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={item.status} />
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(item.updatedAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: "draft" | "published" | "graded" }) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-bold uppercase tracking-wide">
          Draft
        </Badge>
      )
    case "published":
      return (
        <Badge className="text-xs font-bold uppercase tracking-wide bg-foreground text-background hover:bg-foreground">
          Live
        </Badge>
      )
    case "graded":
      return (
        <Badge className="text-xs font-bold uppercase tracking-wide bg-primary text-white hover:bg-primary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Graded
        </Badge>
      )
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short"
  })
}
