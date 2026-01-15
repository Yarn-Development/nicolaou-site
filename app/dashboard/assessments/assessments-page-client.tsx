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
  Eye,
  AlertCircle,
  Calendar
} from "lucide-react"
import type { AssessmentsPageData, VideoItem, Assessment } from "./page"

interface AssessmentsPageClientProps {
  data: AssessmentsPageData
  isDemo: boolean
}

export function AssessmentsPageClient({ data, isDemo }: AssessmentsPageClientProps) {
  const { videoLibrary, assessments, teacherAssignments } = data
  
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [selectedTier, setSelectedTier] = useState("all")
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null)
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({})
  const [showResults, setShowResults] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)

  const playVideo = (video: VideoItem) => {
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm uppercase tracking-wider">Demo Data</p>
            <p className="text-amber-700 text-xs">
              Showing sample assessments. Create assignments to see real assessments here.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-amber-400 text-amber-700 font-bold">
            DEMO
          </Badge>
        </div>
      )}

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
                  
                  <Button
                    variant="ghost"  
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
                
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

            {activeAssessment.questions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  This assessment doesn&apos;t have questions yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add questions to this assignment to enable the interactive assessment.
                </p>
              </div>
            ) : !showResults ? (
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
        <TabsList className="glassmorphic grid w-full grid-cols-3">
          <TabsTrigger value="videos">Video Library</TabsTrigger>
          <TabsTrigger value="assessments">Practice Tests</TabsTrigger>
          <TabsTrigger value="assignments">
            My Assignments
            {teacherAssignments.length > 0 && (
              <Badge variant="secondary" className="ml-2">{teacherAssignments.length}</Badge>
            )}
          </TabsTrigger>
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
            {assessments.filter(a => a.questions.length > 0).map((assessment) => (
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

        <TabsContent value="assignments" className="space-y-4">
          {teacherAssignments.length === 0 ? (
            <Card className="glassmorphic">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No assignments created yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create assignments for your classes to track student progress.
                </p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Assignment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teacherAssignments.map((assignment) => (
                <Card key={assignment.id} className="glassmorphic">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {assignment.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Class</span>
                        <span>{assignment.class_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subject</span>
                        <span>{assignment.subject}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due Date
                        </span>
                        <span>{formatDate(assignment.due_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={assignment.status === "published" ? "default" : "secondary"}>
                        {assignment.status}
                      </Badge>
                      {assignment.submission_count !== undefined && assignment.submission_count > 0 && (
                        <Badge variant="outline">
                          {assignment.submission_count} submissions
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
