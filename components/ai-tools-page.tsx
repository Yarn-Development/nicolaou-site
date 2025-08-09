"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorksheetGenerator } from "@/components/worksheet-generator"
import { AITutor } from "@/components/ai-tutor"
import { motion } from "framer-motion"
import { FileText, MessageSquare, Sparkles } from "lucide-react"

export function AIToolsPage() {
  const [activeTab, setActiveTab] = useState("worksheet")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Tools</h2>
        <p className="text-muted-foreground">Leverage artificial intelligence to enhance your teaching experience</p>
      </div>

      <Tabs defaultValue="worksheet" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glassmorphic">
          <TabsTrigger value="worksheet" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Worksheet Generator
          </TabsTrigger>
          <TabsTrigger value="tutor" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Tutor
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Feedback Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="worksheet" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>AI Worksheet Generator</CardTitle>
                <CardDescription>Create custom worksheets with AI assistance in seconds</CardDescription>
              </CardHeader>
              <CardContent>
                <WorksheetGenerator />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="tutor" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>AI Tutor</CardTitle>
                <CardDescription>Get personalized help and explanations for your students</CardDescription>
              </CardHeader>
              <CardContent>
                <AITutor />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Feedback Assistant</CardTitle>
                <CardDescription>Generate personalized feedback with AI suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Feedback Assistant interface will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
