// Create new file: components/scheme-of-work.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, GripVertical } from "lucide-react"

export function SchemeOfWork() {
  const [newSchemeName, setNewSchemeName] = useState("")
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Scheme of Work Creator</h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Scheme name..." 
            value={newSchemeName}
            onChange={(e) => setNewSchemeName(e.target.value)}
            className="glassmorphic border-muted/30"
          />
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Scheme
          </Button>
        </div>
      </div>
      
      {/* Drag-and-drop interface for topics */}
      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle>Week Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1,2,3,4,5].map((week) => (
              <div key={week} className="flex items-center gap-4 p-3 border border-muted/30 rounded-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <span className="text-sm font-medium">Week {week}</span>
                <div className="flex-1">
                  <Input placeholder="Add topic..." className="glassmorphic border-muted/30" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}