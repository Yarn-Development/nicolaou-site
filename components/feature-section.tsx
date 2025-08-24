"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, GraduationCap, BarChart, FileText, MessageSquare, Sparkles } from "lucide-react"

export function FeatureSection() {
  const [activeTab, setActiveTab] = useState("teacher")

  return (
    <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          {/* Header Section */}
          <div className="space-y-4 max-w-3xl">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              <span className="text-primary font-medium">Features</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Powerful tools for everyone
            </h2>
            <p className="text-muted-foreground md:text-xl lg:text-xl leading-relaxed">
              Our platform adapts to your needs, whether you&#39;re a teacher creating content or a student mastering concepts.
            </p>
          </div>

          {/* Tabs Section */}
          <div className="w-full max-w-6xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Navigation with Enhanced Indicator */}
              <div className="flex justify-center mb-12">
                <div className="relative glassmorphic rounded-lg p-1">
                  <TabsList className="grid grid-cols-2 w-fit bg-transparent relative">
                    {/* Animated Background Indicator */}
                    <motion.div
                      className={`absolute top-1 bottom-1 left-1 right-1/2 rounded-md transition-all duration-300 ${
                        activeTab === "teacher" 
                          ? "bg-primary/20 glow-border" 
                          : "bg-secondary/20 glow-border-violet"
                      }`}
                      animate={{
                        x: activeTab === "teacher" ? 0 : "100%"
                      }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <TabsTrigger 
                      value="teacher" 
                      className={`relative z-10 transition-all duration-300 ${
                        activeTab === "teacher" 
                          ? "text-primary font-semibold" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Teacher View
                      {activeTab === "teacher" && (
                        <motion.div
                          className="absolute -bottom-1 left-1/2 w-2 h-2 bg-primary rounded-full"
                          initial={{ scale: 0, x: "-50%" }}
                          animate={{ scale: 1, x: "-50%" }}
                          transition={{ delay: 0.1 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="student" 
                      className={`relative z-10 transition-all duration-300 ${
                        activeTab === "student" 
                          ? "text-secondary font-semibold" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Student View
                      {activeTab === "student" && (
                        <motion.div
                          className="absolute -bottom-1 left-1/2 w-2 h-2 bg-secondary rounded-full"
                          initial={{ scale: 0, x: "-50%" }}
                          animate={{ scale: 1, x: "-50%" }}
                          transition={{ delay: 0.1 }}
                        />
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Active Tab Indicator Text */}
              <div className="flex justify-center mb-8">
                <motion.div
                  key={activeTab}
                  className={`text-sm font-medium px-4 py-2 rounded-full border ${
                    activeTab === "teacher" 
                      ? "text-primary border-primary/30 bg-primary/5" 
                      : "text-secondary border-secondary/30 bg-secondary/5"
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {activeTab === "teacher" ? "🎓 Teacher Tools" : "📚 Student Features"}
                </motion.div>
              </div>

              {/* Teacher Tab Content */}
              <TabsContent value="teacher" className="mt-0">
                <motion.div
                  key="teacher-content"
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <FeatureCard
                    icon={<FileText className="h-6 w-6 text-primary bg-auto" />}
                    title="AI Worksheet Generator"
                    description="Create custom worksheets with AI assistance in seconds, not hours. Perfect for any GCSE topic."
                    accentColor="primary"
                    delay={0.1}
                  />
                  <FeatureCard
                    icon={<BarChart className="h-6 w-6 text-primary" />}
                    title="Performance Analytics"
                    description="Track student progress with detailed insights, visual charts, and actionable recommendations."
                    accentColor="primary"
                    delay={0.2}
                  />
                  <FeatureCard
                    icon={<BookOpen className="h-6 w-6 text-primary" />}
                    title="Scheme of Work Editor"
                    description="Plan your curriculum with an intuitive drag-and-drop interface and GCSE alignment."
                    accentColor="primary"
                    delay={0.3}
                  />
                  <FeatureCard
                    icon={<MessageSquare className="h-6 w-6 text-primary" />}
                    title="AI Feedback Assistant"
                    description="Generate personalized, constructive feedback with AI suggestions for every student."
                    accentColor="primary"
                    delay={0.4}
                  />
                  <FeatureCard
                    icon={<Sparkles className="h-6 w-6 text-primary" />}
                    title="Smart Content Creation"
                    description="Generate engaging educational content, quizzes, and assessments with advanced AI."
                    accentColor="primary"
                    delay={0.4}
                  />
                  <FeatureCard
                    icon={<GraduationCap className="h-6 w-6 text-primary" />}
                    title="Class Management"
                    description="Organize classes, track individual progress, and manage assignments effortlessly."
                    accentColor="primary"
                    delay={0.4}
                  />
                </motion.div>
              </TabsContent>

              {/* Student Tab Content */}
              <TabsContent value="student" className="mt-0">
                <motion.div
                  key="student-content"
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <FeatureCard
                    icon={<Sparkles className="h-6 w-6 text-secondary" />}
                    title="AI Personal Tutor"
                    description="Get personalized help, step-by-step explanations, and hints whenever you need them."
                    accentColor="secondary"
                    delay={0.1}
                  />
                  <FeatureCard
                    icon={<BarChart className="h-6 w-6 text-secondary" />}
                    title="Progress Dashboard"
                    description="Visualize your learning journey with interactive charts and achievement tracking."
                    accentColor="secondary"
                    delay={0.2}
                  />
                  <FeatureCard
                    icon={<FileText className="h-6 w-6 text-secondary" />}
                    title="Adaptive Practice"
                    description="Practice with questions that automatically adjust to your current skill level."
                    accentColor="secondary"
                    delay={0.3}
                  />
                  <FeatureCard
                    icon={<MessageSquare className="h-6 w-6 text-secondary" />}
                    title="Instant Feedback"
                    description="Receive immediate, detailed feedback on your work to accelerate learning."
                    accentColor="secondary"
                    delay={0.4}
                  />
                  <FeatureCard
                    icon={<BookOpen className="h-6 w-6 text-secondary" />}
                    title="Smart Study Path"
                    description="Follow a personalized learning roadmap optimized for your GCSE goals."
                    accentColor="secondary"
                    delay={0.5}
                  />
                  <FeatureCard
                    icon={<GraduationCap className="h-6 w-6 text-secondary" />}
                    title="Resource Library"
                    description="Access thousands of practice questions, videos, and study materials."
                    accentColor="secondary"
                    delay={0.6}
                  />
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  accentColor?: "primary" | "secondary"
  delay?: number
}

function FeatureCard({ icon, title, description, accentColor = "primary", delay = 0 }: FeatureCardProps) {
  const glowClass = accentColor === "primary" ? "hover:glow-border" : "hover:glow-border-violet"
  
  return (
    <motion.div
      className={`glassmorphic rounded-lg p-6 card-hover transition-all duration-300 ${glowClass} group`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-${accentColor}/10 group-hover:bg-${accentColor}/20 transition-colors duration-300`}>
        {icon}
      </div>
      <h3 className="mb-3 text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}