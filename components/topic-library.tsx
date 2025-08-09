// Create new file: components/topic-library.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, FileText, Calculator } from "lucide-react"

const gcseTopics = {
  "Number": ["Integers", "Fractions", "Decimals", "Percentages", "Ratio"],
  "Algebra": ["Linear Equations", "Quadratics", "Simultaneous Equations", "Graphs"],
  "Geometry": ["Angles", "Area & Perimeter", "Volume", "Pythagoras", "Trigonometry"],
  "Statistics": ["Data Collection", "Averages", "Probability", "Graphs & Charts"]
}

export function TopicLibrary() {
  const [selectedStrand, setSelectedStrand] = useState("Number")
  const [selectedTier, setSelectedTier] = useState("Foundation")
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">GCSE Topic Library</h3>
        <div className="flex gap-2">
          <Badge variant={selectedTier === "Foundation" ? "default" : "outline"} 
                 onClick={() => setSelectedTier("Foundation")} 
                 className="cursor-pointer">
            Foundation
          </Badge>
          <Badge variant={selectedTier === "Higher" ? "default" : "outline"} 
                 onClick={() => setSelectedTier("Higher")} 
                 className="cursor-pointer">
            Higher
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {Object.keys(gcseTopics).map((strand) => (
          <Card key={strand} 
                className={`glassmorphic cursor-pointer transition-all ${
                  selectedStrand === strand ? "glow-border" : ""
                }`}
                onClick={() => setSelectedStrand(strand)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{strand}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calculator className="h-3 w-3" />
                {gcseTopics[strand].length} topics
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Topic details for selected strand */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gcseTopics[selectedStrand]?.map((topic) => (
          <Card key={topic} className="glassmorphic">
            <CardHeader>
              <CardTitle className="text-sm">{topic}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <FileText className="h-3 w-3" />
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedTier}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}