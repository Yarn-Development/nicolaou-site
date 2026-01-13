
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorksheetGenerator } from "@/components/worksheet-generator"
import { Plus } from "lucide-react"

export function AssignmentManagement() {
  const [activeView] = useState("overview")
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Assignment Management</h3>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>
      
      {activeView === "create" && <WorksheetGenerator />}
      
      {/* Assignment list, due dates, student submissions */}

        {activeView === "overview" && (
            <Card className="glassmorphic">
            <CardHeader>
                <CardTitle>Upcoming Assignments</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">No assignments due this week.</p>
            </CardContent>
            </Card>
        )}
    </div>
  )
}