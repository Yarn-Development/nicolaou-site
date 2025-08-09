"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductDemo } from "./product-demo"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Users, BookOpen, BarChart3, Sparkles, ChevronRight } from "lucide-react"

// Mock data for live dashboard preview
const dashboardData = {
  studentsOnline: 47,
  assignmentsCompleted: 23,
  averageScore: 87,
  topicProgress: [
    { topic: "Quadratic Equations", progress: 85, color: "#00BFFF" },
    { topic: "Trigonometry", progress: 72, color: "#A259FF" },
    { topic: "Statistics", progress: 94, color: "#00FFC6" },
  ],
  recentActivity: [
    { student: "Emma Wilson", action: "Completed worksheet", time: "2 min ago" },
    { student: "James Chen", action: "Started practice test", time: "5 min ago" },
    { student: "Sarah Davis", action: "Asked for help", time: "8 min ago" },
  ]
}

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activePreview, setActivePreview] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  // Animated background particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number
    }[] = []

    const colors = ["#00BFFF", "#A259FF", "#00FFC6"]

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
      })
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        p.x += p.speedX
        p.y += p.speedY

        if (p.x > canvas.width) p.x = 0
        if (p.x < 0) p.x = canvas.width
        if (p.y > canvas.height) p.y = 0
        if (p.y < 0) p.y = canvas.height
      }

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Auto-cycle through preview tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePreview((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleDemoClick = () => {
    setIsPlaying(true)
    // Here you could trigger a more detailed demo or redirect to dashboard
    setShowDemo(true)
    setTimeout(() => setIsPlaying(false), 3000)
  }
  

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10 opacity-60" />
      
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
          {/* Left Column - Content */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Education Platform</span>
              </motion.div>

              <motion.h1
                className="text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl/none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <span className="bg-gradient-to-r from-[#00BFFF] to-[#A259FF] text-transparent bg-clip-text font-medium">
                  Transform GCSE Maths
                </span>
                <br />
                <span className="text-foreground">with Intelligent Teaching</span>
              </motion.h1>

              <motion.p
                className="max-w-[600px] text-xl text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Create personalized worksheets, track student progress, and deliver adaptive assessments—all powered by AI that understands how students learn best.
              </motion.p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 glow-border shadow-lg group">
                <Link href="/dashboard" className="flex items-center gap-2">
                  Get Started Free
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="glassmorphic border-primary/30 hover:bg-primary/10 hover:glow-border group"
                onClick={handleDemoClick}
              >
                <Play className={`h-4 w-4 mr-2 ${isPlaying ? 'animate-spin' : ''}`} />
                {isPlaying ? 'Loading Demo...' : 'Try Live Demo'}
              </Button>
            </motion.div>

           </div>

          {/* Right Column - Interactive Dashboard Preview */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative glassmorphic rounded-xl p-6 glow-border">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Teacher Dashboard</h3>
                <div className="flex gap-1">
                  {[0, 1, 2].map((index) => (
                    <button
                      key={index}
                      onClick={() => setActivePreview(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activePreview === index ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview Content */}
              <AnimatePresence mode="wait">
                {activePreview === 0 && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glassmorphic p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Students Online</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{dashboardData.studentsOnline}</div>
                      </div>
                      <div className="glassmorphic p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-medium">Completed Today</span>
                        </div>
                        <div className="text-2xl font-bold text-secondary">{dashboardData.assignmentsCompleted}</div>
                      </div>
                    </div>
                    <div className="glassmorphic p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Class Average</span>
                      </div>
                      <div className="text-2xl font-bold text-accent">{dashboardData.averageScore}%</div>
                    </div>
                  </motion.div>
                )}

                {activePreview === 1 && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h4 className="font-medium mb-3">Topic Progress</h4>
                    {dashboardData.topicProgress.map((topic, index) => (
                      <div key={topic.topic} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{topic.topic}</span>
                          <span className="font-medium" style={{ color: topic.color }}>
                            {topic.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2">
                          <motion.div
                            className="h-2 rounded-full"
                            style={{ backgroundColor: topic.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activePreview === 2 && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h4 className="font-medium mb-3">Recent Activity</h4>
                    {dashboardData.recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-3 p-2 glassmorphic rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                          {activity.student.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{activity.student}</div>
                          <div className="text-xs text-muted-foreground">{activity.action}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interactive Elements */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20 group"
                  onClick={() => window.open('/dashboard', '_blank')}
                >
                  <span 
                    className="font-medium"
                    style={{
                      background: 'linear-gradient(to right, #00BFFF, #A259FF)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent'
                    }}
                  >
                    Explore Full Dashboard
                  </span>
                  <ChevronRight className="h-4 w-4 ml-2 text-primary group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Floating Action Buttons */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 space-y-2">
              <motion.button
                className="w-12 h-12 rounded-full glassmorphic flex items-center justify-center glow-border-violet hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="h-5 w-5 text-secondary" />
              </motion.button>
              <motion.button
                className="w-12 h-12 rounded-full glassmorphic flex items-center justify-center glow-border hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <BookOpen className="h-5 w-5 text-primary" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
      {showDemo && (
  <ProductDemo onClose={() => setShowDemo(false)} />
)}

    </section>
  )
}