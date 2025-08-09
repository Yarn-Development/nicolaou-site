"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, FileText, Plus, Minus, Trash2, Download } from "lucide-react"
import { toast } from "sonner"

export function WorksheetGenerator() {
  const [topic, setTopic] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [difficulty, setDifficulty] = useState([3])
  const [numQuestions, setNumQuestions] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [worksheet, setWorksheet] = useState(null)

  const handleGenerate = () => {
    if (!topic || !gradeLevel) return

    setIsGenerating(true)

    toast.loading("Generating your worksheet...", {
      description: `Creating ${numQuestions} questions about ${topic} for grade ${gradeLevel}`,
    })

    // Simulate AI generation
    setTimeout(() => {
      const questions = [
        {
          id: 1,
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          answer: "Paris",
        },
        {
          id: 2,
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          answer: "Mars",
        },
        {
          id: 3,
          question: "What is 7 × 8?",
          options: ["54", "56", "64", "72"],
          answer: "56",
        },
        {
          id: 4,
          question: "Who wrote Romeo and Juliet?",
          options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
          answer: "William Shakespeare",
        },
        {
          id: 5,
          question: "What is the chemical symbol for water?",
          options: ["H2O", "CO2", "O2", "N2"],
          answer: "H2O",
        },
      ]

      setWorksheet({
        title: `${topic} - Grade ${gradeLevel}`,
        description: `A worksheet about ${topic} for grade ${gradeLevel} students.`,
        questions: questions.slice(0, numQuestions),
      })

      setIsGenerating(false)

      toast.success("Worksheet generated successfully", {
        description: `${numQuestions} questions created for ${topic}`,
      })
    }, 2000)
  }

  const addQuestion = () => {
    setNumQuestions((prev) => Math.min(prev + 1, 10))
  }

  const removeQuestion = () => {
    setNumQuestions((prev) => Math.max(prev - 1, 1))
  }

  return (
    <div className="space-y-6">
      {!worksheet ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Photosynthesis, Fractions, World War II"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="glassmorphic border-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="glassmorphic border-muted/30">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent className="glassmorphic border-muted/30">
                  <SelectItem value="6">6th Grade</SelectItem>
                  <SelectItem value="7">7th Grade</SelectItem>
                  <SelectItem value="8">8th Grade</SelectItem>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Difficulty Level</Label>
              <span className="text-sm text-muted-foreground">
                {difficulty[0] === 1
                  ? "Easy"
                  : difficulty[0] === 2
                    ? "Medium-Easy"
                    : difficulty[0] === 3
                      ? "Medium"
                      : difficulty[0] === 4
                        ? "Medium-Hard"
                        : "Hard"}
              </span>
            </div>
            <Slider
              defaultValue={[3]}
              max={5}
              min={1}
              step={1}
              value={difficulty}
              onValueChange={setDifficulty}
              className=""
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Number of Questions</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={removeQuestion}
                  disabled={numQuestions <= 1}
                  className="h-8 w-8 glassmorphic border-muted/30"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{numQuestions}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addQuestion}
                  disabled={numQuestions >= 10}
                  className="h-8 w-8 glassmorphic border-muted/30"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional-instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="additional-instructions"
              placeholder="Any specific requirements or focus areas..."
              className="min-h-[100px] glassmorphic border-muted/30"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic || !gradeLevel || isGenerating}
            className="w-full bg-primary hover:bg-primary/90 glow-border"
          >
            {isGenerating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Worksheet
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{worksheet.title}</h3>
              <p className="text-sm text-muted-foreground">{worksheet.description}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="glassmorphic border-muted/30"
                onClick={() => {
                  setWorksheet(null)
                  toast("Worksheet discarded", {
                    description: "Your worksheet has been discarded",
                  })
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  toast.success("Worksheet downloaded", {
                    description: "Your worksheet has been downloaded successfully",
                  })
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <div className="space-y-6 rounded-lg border border-muted/30 p-6 glassmorphic">
            <div className="flex items-center justify-between border-b border-muted/30 pb-4">
              <div>
                <h4 className="text-lg font-bold">{worksheet.title}</h4>
                <p className="text-sm text-muted-foreground">Name: ___________________________</p>
              </div>
              <div className="text-sm text-muted-foreground">Date: _______________</div>
            </div>

            <div className="space-y-6">
              {worksheet.questions.map((q, index) => (
                <div key={q.id} className="space-y-3">
                  <div className="flex items-start">
                    <span className="mr-2 font-medium">{index + 1}.</span>
                    <span>{q.question}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                    {q.options.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-muted/50 text-xs">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              className="glassmorphic border-muted/30"
              onClick={() => {
                setWorksheet(null)
                toast("Creating new worksheet", {
                  description: "Start fresh with a new worksheet",
                })
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create New
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                toast.success("Worksheet assigned", {
                  description: "Worksheet has been assigned to your class",
                })
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Assign to Class
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
