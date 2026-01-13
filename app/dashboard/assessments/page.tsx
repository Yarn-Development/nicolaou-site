// Create new file: app/dashboard/assessments/page.tsx
"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  BookOpen,
  FileText,
  Clock,
  Search,
  Plus,
  Eye
} from "lucide-react"

// Mock video and assessment data
const videoLibrary = [
  {
    id: "1",
    title: "Introduction to Quadratic Equations",
    topic: "Algebra",
    tier: "Higher",
    duration: "12:45",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/quadratic-equations.mp4",
    description: "Learn the fundamentals of quadratic equations, including standard form and basic solving techniques.",
    assessmentId: "assessment-1",
    views: 1247,
    difficulty: "Intermediate"
  },
  {
    id: "2",
    title: "Pythagoras Theorem Applications",
    topic: "Geometry", 
    tier: "Foundation",
    duration: "15:30",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/pythagoras-theorem.mp4",
    description: "Explore real-world applications of Pythagoras theorem with step-by-step examples.",
    assessmentId: "assessment-2",
    views: 892,
    difficulty: "Beginner"
  },
  {
    id: "3",
    title: "Statistical Measures and Averages",
    topic: "Statistics",
    tier: "Higher",
    duration: "18:20",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/statistical-measures.mp4",
    description: "Master mean, median, mode, and range calculations with practical examples.",
    assessmentId: "assessment-3",
    views: 656,
    difficulty: "Advanced"
  },
  {
    id: "4",
    title: "Fractions and Decimals",
    topic: "Number",
    tier: "Foundation",
    duration: "10:15",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/fractions-decimals.mp4",
    description: "Convert between fractions and decimals with confidence using proven methods.",
    assessmentId: "assessment-4",
    views: 1456,
    difficulty: "Beginner"
  },
    {
    id: "5",
    title: "Solving Simultaneous Equations",
    topic: "Algebra",
    tier: "Higher",
    duration: "14:10",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/SimEq1.mp4",
    description: "Learn how to solve simultaneous equations using substitution and elimination methods.",
    assessmentId: "assessment-5",
    views: 1032,
    difficulty: "Intermediate"
}
]

const assessments = [
  {
    id: "assessment-1",
    title: "Quadratic Equations Practice",
    questions: [
      {
        id: "q1",
        question: "Solve the equation x² + 5x + 6 = 0",
        type: "multiple-choice",
        options: ["x = -2, x = -3", "x = 2, x = 3", "x = -1, x = -6", "x = 1, x = 6"],
        correct: 0,
        explanation: "Factor the quadratic: (x + 2)(x + 3) = 0, so x = -2 or x = -3"
      },
      {
        id: "q2", 
        question: "What is the discriminant of x² - 4x + 4 = 0?",
        type: "input",
        correct: "0",
        explanation: "Discriminant = b² - 4ac = (-4)² - 4(1)(4) = 16 - 16 = 0"
      },
      {
        id: "q3",
        question: "Complete the square: x² + 6x + ?",
        type: "input",
        correct: "9",
        explanation: "To complete the square, take half of the coefficient of x and square it: (6/2)² = 9"
      }
    ],
    timeLimit: 30,
    difficulty: "Intermediate"
  },
  {
    id: "assessment-2",
    title: "Pythagoras Theorem Quiz",
    questions: [
      {
        id: "q1",
        question: "In a right triangle with legs of 3cm and 4cm, what is the hypotenuse?",
        type: "multiple-choice",
        options: ["5cm", "6cm", "7cm", "8cm"],
        correct: 0,
        explanation: "Using a² + b² = c²: 3² + 4² = 9 + 16 = 25, so c = √25 = 5cm"
      },
      {
        id: "q2",
        question: "Calculate the missing side: a = 5, c = 13, b = ?",
        type: "input",
        correct: "12",
        explanation: "Using a² + b² = c²: 5² + b² = 13², so b² = 169 - 25 = 144, b = 12"
      }
    ],
    timeLimit: 20,
    difficulty: "Beginner"
  }
]

export default function AssessmentsPage() {
  const [selectedVideo, setSelectedVideo] = useState<typeof videoLibrary[0] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [selectedTier, setSelectedTier] = useState("all")
  const [activeAssessment, setActiveAssessment] = useState<typeof assessments[0] | null>(null)
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({})
  const [showResults, setShowResults] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)

  const playVideo = (video: typeof videoLibrary[0]) => {
    setSelectedVideo(video)
    setIsPlaying(true)
  }

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])
const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (videoRef.current && duration > 0) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }
}

const toggleFullscreen = useCallback(() => {
  if (videoRef.current) {
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }
}, [])


const handleKeyPress = useCallback((e: KeyboardEvent) => {
  if (!selectedVideo) return

  switch (e.code) {
    case 'Space':
      e.preventDefault()
      togglePlayPause()
      break
    case 'KeyM':
      toggleMute()
      break
    case 'KeyF':
      toggleFullscreen()
      break
    case 'Escape':
      setSelectedVideo(null)
      break
    case 'ArrowLeft':
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, currentTime - 10)
      }
      break
    case 'ArrowRight':
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(duration, currentTime + 10)
      }
      break
  }
}, [selectedVideo, currentTime, duration, togglePlayPause, toggleMute, toggleFullscreen])

// Add keyboard event listeners
useEffect(() => {
  if (selectedVideo) {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }
}, [selectedVideo, handleKeyPress])
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }
const togglePictureInPicture = async () => {
  if (videoRef.current) {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (error) {
      console.error('Picture-in-picture failed:', error)
    }
  }
}

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const filteredVideos = videoLibrary.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.topic.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTopic = selectedTopic === "all" || video.topic === selectedTopic
    const matchesTier = selectedTier === "all" || video.tier === selectedTier
    
    return matchesSearch && matchesTopic && matchesTier
  })

  const startAssessment = (assessmentId: string) => {
    const assessment = assessments.find(a => a.id === assessmentId)
    if (assessment) {
      setActiveAssessment(assessment)
      setUserAnswers({})
      setShowResults(false)
    }
  }

  const submitAssessment = () => {
    setShowResults(true)
  }

  const calculateScore = () => {
    if (!activeAssessment) return 0
    let correct = 0
    activeAssessment.questions.forEach(question => {
      const userAnswer = userAnswers[question.id]
      if (question.type === "multiple-choice") {
        if (parseInt(userAnswer) === question.correct) correct++
      } else if (question.type === "input") {
        const correctAnswer = typeof question.correct === 'string' ? question.correct : String(question.correct)
        if (userAnswer?.toLowerCase() === correctAnswer.toLowerCase()) correct++
      }
    })
    return Math.round((correct / activeAssessment.questions.length) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessments & Videos</h1>
          <p className="text-muted-foreground">
            Interactive learning with video lessons and practice assessments
          </p>
        </div>
        <Button className="glassmorphic hover:glow-border">
          <Plus className="h-4 w-4 mr-2" />
          Create Assessment
        </Button>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl glassmorphic rounded-xl overflow-hidden">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video bg-black"
                src={selectedVideo.videoPath}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
              
              {/* Video Controls */}
<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
  <div className="flex items-center gap-4">
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePlayPause}
      className="text-white hover:bg-white/20"
    >
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
    
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMute}
      className="text-white hover:bg-white/20"
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
    
    {/* Skip buttons */}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, currentTime - 10)
        }
      }}
      className="text-white hover:bg-white/20"
    >
      <SkipBack className="h-4 w-4" />
    </Button>
    
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, currentTime + 10)
        }
      }}
      className="text-white hover:bg-white/20"
    >
      <SkipForward className="h-4 w-4" />
    </Button>
    
    <div className="flex-1 flex items-center gap-2">
      <span className="text-white text-sm">{formatTime(currentTime)}</span>
      <div 
        className="flex-1 bg-white/20 rounded-full h-1 cursor-pointer hover:h-2 transition-all"
        onClick={handleProgressClick}
      >
        <div 
          className="bg-primary rounded-full h-full transition-all"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      <span className="text-white text-sm">{formatTime(duration)}</span>
    </div>
    
    {/* Picture-in-picture button */}
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePictureInPicture}
      className="text-white hover:bg-white/20"
      title="Picture in Picture"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        <rect x="10" y="10" width="8" height="6" rx="1"/>
      </svg>
    </Button>
    
    {/* Fullscreen Button */}
    <Button
      variant="ghost"  
      size="icon"
      onClick={toggleFullscreen}
      className="text-white hover:bg-white/20"
    >
      <Maximize className="h-4 w-4" />
    </Button>
  </div>
  
  {/* Control hints */}
  <div className="mt-2 text-xs text-white/60 text-center">
    Space: Play/Pause • M: Mute • F: Fullscreen • ←/→: Skip 10s • Esc: Close
  </div>
</div>
            </div>
            
            {/* Video Info & Assessment Button */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{selectedVideo.title}</h3>
                  <p className="text-muted-foreground mb-4">{selectedVideo.description}</p>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{selectedVideo.topic}</Badge>
                    <Badge variant="secondary">{selectedVideo.tier}</Badge>
                    <Badge variant="outline">{selectedVideo.difficulty}</Badge>
                  </div>
                </div>
                <Button 
                  onClick={() => startAssessment(selectedVideo.assessmentId)}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Take Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      {activeAssessment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glassmorphic rounded-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{activeAssessment.title}</h3>
                <p className="text-muted-foreground">
                  {activeAssessment.questions.length} questions • {activeAssessment.timeLimit} minutes
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setActiveAssessment(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            {!showResults ? (
              <div className="space-y-6">
                {activeAssessment.questions.map((question, index) => (
                  <Card key={question.id} className="glassmorphic">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Question {index + 1}: {question.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {question.type === "multiple-choice" ? (
                        <div className="space-y-2">
                          {question.options?.map((option, optionIndex) => (
                            <label key={optionIndex} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name={question.id}
                                value={optionIndex}
                                onChange={(e) => setUserAnswers(prev => ({
                                  ...prev,
                                  [question.id]: e.target.value
                                }))}
                                className="text-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Input
                          placeholder="Enter your answer..."
                          value={userAnswers[question.id] || ""}
                          onChange={(e) => setUserAnswers(prev => ({
                            ...prev,
                            [question.id]: e.target.value
                          }))}
                          className="glassmorphic border-muted/30"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  onClick={submitAssessment}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={Object.keys(userAnswers).length !== activeAssessment.questions.length}
                >
                  Submit Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {calculateScore()}%
                  </div>
                  <p className="text-muted-foreground">
                    You scored {Math.round((calculateScore() / 100) * activeAssessment.questions.length)} out of {activeAssessment.questions.length}
                  </p>
                </div>

                <div className="space-y-4">
                  {activeAssessment.questions.map((question, index) => {
                    const userAnswer = userAnswers[question.id]
                    const correctAnswer = typeof question.correct === 'string' ? question.correct : String(question.correct)
                    const isCorrect = question.type === "multiple-choice" 
                      ? parseInt(userAnswer) === question.correct
                      : userAnswer?.toLowerCase() === correctAnswer.toLowerCase()

                    return (
                      <Card key={question.id} className={`glassmorphic ${isCorrect ? 'border-green-500/50' : 'border-red-500/50'}`}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            {isCorrect ? '✅' : '❌'}
                            Question {index + 1}: {question.question}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Your answer:</strong> {
                                question.type === "multiple-choice" 
                                  ? question.options?.[parseInt(userAnswer)] || "No answer"
                                  : userAnswer || "No answer"
                              }
                            </p>
                            <p className="text-sm">
                              <strong>Correct answer:</strong> {
                                question.type === "multiple-choice"
                                  ? question.options?.[question.correct as number]
                                  : question.correct
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList className="glassmorphic grid w-full grid-cols-2">
          <TabsTrigger value="videos">Video Library</TabsTrigger>
          <TabsTrigger value="assessments">Practice Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 glassmorphic border-muted/30"
              />
            </div>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[180px] glassmorphic border-muted/30">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="Algebra">Algebra</SelectItem>
                <SelectItem value="Geometry">Geometry</SelectItem>
                <SelectItem value="Statistics">Statistics</SelectItem>
                <SelectItem value="Number">Number</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-[180px] glassmorphic border-muted/30">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Higher">Higher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Video Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="glassmorphic group hover:glow-border transition-all duration-300 cursor-pointer" onClick={() => playVideo(video)}>
                <div className="relative">
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                    <Play className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{video.topic}</Badge>
                    <Badge variant="secondary" className="text-xs">{video.tier}</Badge>
                    <Badge variant="outline" className="text-xs">{video.difficulty}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {video.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {video.views.toLocaleString()} views
                    </span>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        startAssessment(video.assessmentId)
                      }}
                      className="text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="glassmorphic">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {assessment.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {assessment.questions.length} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {assessment.timeLimit} min
                    </span>
                  </div>
                  <Badge variant="outline">{assessment.difficulty}</Badge>
                  <Button 
                    onClick={() => startAssessment(assessment.id)}
                    className="w-full"
                  >
                    Start Assessment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}