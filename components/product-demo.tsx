// Create new file: components/product-demo.tsx
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Wand2, 
  Users, 
  BarChart3, 
  FileText, 
  Brain, 
  CheckCircle,
  Clock,
  Target,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  X
} from "lucide-react"

interface DemoProps {
  onClose: () => void
}

export function ProductDemo({ onClose }: DemoProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const demoSteps = [
    {
      id: "intro",
      title: "Welcome to Nicolaou's Maths",
      description: "Experience the future of GCSE mathematics education",
      component: "intro"
    },
    {
      id: "worksheet-gen",
      title: "AI Worksheet Generator",
      description: "Create custom worksheets in seconds with AI assistance",
      component: "worksheet"
    },
    {
      id: "student-tracking",
      title: "Student Progress Tracking",
      description: "Monitor individual and class performance in real-time",
      component: "tracking"
    },
    {
      id: "adaptive-feedback",
      title: "Intelligent Feedback System",
      description: "AI-powered personalized feedback for every student",
      component: "feedback"
    },
    {
      id: "analytics",
      title: "Advanced Analytics",
      description: "Data-driven insights to improve teaching outcomes",
      component: "analytics"
    }
  ]

  // Auto-advance demo steps
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % demoSteps.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [isPlaying, demoSteps.length])

  const DemoIntro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-[#00BFFF] to-[#A259FF] text-transparent bg-clip-text">
            AI-Powered Education
          </span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Transform your teaching with intelligent tools that adapt to every student&apos;s learning style
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="glassmorphic p-4 rounded-lg text-center">
          <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
          <div className="text-sm font-medium">2000+</div>
          <div className="text-xs text-muted-foreground">Worksheets</div>
        </div>
        <div className="glassmorphic p-4 rounded-lg text-center">
          <Users className="h-6 w-6 text-secondary mx-auto mb-2" />
          <div className="text-sm font-medium">50k+</div>
          <div className="text-xs text-muted-foreground">Students</div>
        </div>
        <div className="glassmorphic p-4 rounded-lg text-center">
          <Target className="h-6 w-6 text-accent mx-auto mb-2" />
          <div className="text-sm font-medium">94%</div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>
      </div>
    </motion.div>
  )

  const WorksheetDemo = () => {
    const [generationStep, setGenerationStep] = useState(0)
    
    useEffect(() => {
      const timer = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % 4)
      }, 1500)
      return () => clearInterval(timer)
    }, [])

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="glassmorphic p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Generate Worksheet</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Topic: Quadratic Equations</span>
              <Badge variant="secondary">Higher Tier</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Difficulty: Mixed</span>
              <Badge variant="outline">12 Questions</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Generation Progress</div>
              <Progress value={(generationStep + 1) * 25} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {generationStep === 0 && "Analyzing curriculum requirements..."}
                {generationStep === 1 && "Generating diverse question types..."}
                {generationStep === 2 && "Creating answer schemes..."}
                {generationStep === 3 && "Finalizing worksheet layout..."}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Question Types</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Factorising</span>
                <span className="text-primary">4</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Solving</span>
                <span className="text-secondary">5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Graphing</span>
                <span className="text-accent">3</span>
              </div>
            </div>
          </div>
          
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Features</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Answer Key</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Mark Scheme</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Extension Tasks</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const TrackingDemo = () => {
    const students = [
      { name: "Emma Wilson", progress: 92, status: "Excelling", color: "#00FFC6" },
      { name: "James Chen", progress: 78, status: "On Track", color: "#00BFFF" },
      { name: "Sarah Davis", progress: 45, status: "Needs Support", color: "#A259FF" },
      { name: "Alex Brown", progress: 89, status: "Excelling", color: "#00FFC6" },
    ]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="glassmorphic p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Class Overview</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24</div>
              <div className="text-xs text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">18</div>
              <div className="text-xs text-muted-foreground">Active Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">87%</div>
              <div className="text-xs text-muted-foreground">Avg. Score</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {students.map((student, index) => (
            <motion.div
              key={student.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glassmorphic p-3 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: `linear-gradient(135deg, ${student.color}, ${student.color}80)` }}
                  >
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.status}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: student.color }}>
                    {student.progress}%
                  </div>
                </div>
              </div>
              <Progress value={student.progress} className="h-1" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  const FeedbackDemo = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="glassmorphic p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-5 w-5 text-secondary" />
          <h3 className="font-semibold">AI Feedback Generator</h3>
        </div>
        
        <div className="space-y-3">
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">Student: Emma Wilson</div>
            <div className="text-sm text-muted-foreground mb-2">
              Question: Solve x² + 5x + 6 = 0
            </div>
            <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
              ✓ Excellent work! You correctly factorised the quadratic and found both solutions. 
              Your working is clear and methodical. Try the extension question on completing the square.
            </div>
          </div>
          
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">Student: James Chen</div>
            <div className="text-sm text-muted-foreground mb-2">
              Question: Find the turning point of y = x² - 4x + 3
            </div>
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              ⚠ Good attempt! You found the x-coordinate correctly, but remember to substitute back 
              to find the y-coordinate. Review: Completing the Square method.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glassmorphic p-3 rounded-lg text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <div className="text-sm font-medium">Personalized</div>
          <div className="text-xs text-muted-foreground">Feedback</div>
        </div>
        <div className="glassmorphic p-3 rounded-lg text-center">
          <Clock className="h-6 w-6 text-secondary mx-auto mb-2" />
          <div className="text-sm font-medium">Instant</div>
          <div className="text-xs text-muted-foreground">Generation</div>
        </div>
      </div>
    </motion.div>
  )

  const AnalyticsDemo = () => {
    const topicData = [
      { topic: "Algebra", mastery: 85, trend: "+5%" },
      { topic: "Geometry", mastery: 78, trend: "+12%" },
      { topic: "Statistics", mastery: 92, trend: "+3%" },
      { topic: "Number", mastery: 88, trend: "+8%" },
    ]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="glassmorphic p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">Learning Analytics</h3>
          </div>
          
          <div className="space-y-3">
            {topicData.map((item) => (
              <div key={item.topic} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.topic}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.mastery}%</span>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      {item.trend}
                    </Badge>
                  </div>
                </div>
                <Progress value={item.mastery} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">This Week</div>
            <div className="text-2xl font-bold text-primary">156</div>
            <div className="text-xs text-muted-foreground">Questions Completed</div>
          </div>
          <div className="glassmorphic p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">Improvement</div>
            <div className="text-2xl font-bold text-green-500">+12%</div>
            <div className="text-xs text-muted-foreground">Since Last Month</div>
          </div>
        </div>
      </motion.div>
    )
  }

  const renderDemoContent = () => {
    const step = demoSteps[currentStep]
    
    switch (step.component) {
      case "intro": return <DemoIntro />
      case "worksheet": return <WorksheetDemo />
      case "tracking": return <TrackingDemo />
      case "feedback": return <FeedbackDemo />
      case "analytics": return <AnalyticsDemo />
      default: return <DemoIntro />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl glassmorphic rounded-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-xl font-bold">Product Demo</h2>
            <p className="text-sm text-muted-foreground">
              {demoSteps[currentStep].description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {renderDemoContent()}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(0)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {demoSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentStep === index ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(Math.min(demoSteps.length - 1, currentStep + 1))}
              disabled={currentStep === demoSteps.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}