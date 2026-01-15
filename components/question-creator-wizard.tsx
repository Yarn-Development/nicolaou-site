"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  Eye,
  Save,
  RefreshCw,
  Wand2,
  GraduationCap,
  BookOpen,
  Target,
  Calculator as CalculatorIcon,
  FileText,
  Lightbulb,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { DifficultyTier } from "@/lib/types/database"
import { LatexPreview } from "@/components/latex-preview"
import {
  QUESTION_TYPES,
  getTopicsForLevel,
  getSubTopicsForTopic,
  getAllLevels,
  type CurriculumLevel,
  type QuestionType,
} from "@/lib/curriculum-data"

interface GeneratedQuestion {
  question_latex: string
  answer: string
  explanation: string
  marks: number
}

interface OCRResult {
  question_latex: string
  suggested_topic: string
  suggested_difficulty: DifficultyTier
}

export function QuestionCreatorWizard() {
  const [activeTab, setActiveTab] = useState<'ai' | 'ocr'>('ai')
  
  // AI Generator State - Curriculum Aware
  const [aiLevel, setAiLevel] = useState<CurriculumLevel>('GCSE Higher')
  const [aiTopic, setAiTopic] = useState('')
  const [aiSubTopic, setAiSubTopic] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType>('Fluency')
  const [marks, setMarks] = useState<number>(3)
  const [calculatorAllowed, setCalculatorAllowed] = useState(true)
  const [userContext, setUserContext] = useState('')
  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiGenerated, setAiGenerated] = useState<GeneratedQuestion | null>(null)
  const [aiEditedLatex, setAiEditedLatex] = useState('')

  // OCR State
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null)
  const [ocrImageUrl, setOcrImageUrl] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrUploading, setOcrUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [ocrEditedLatex, setOcrEditedLatex] = useState('')
  
  // OCR Metadata (curriculum-aware tagging)
  const [ocrLevel, setOcrLevel] = useState<CurriculumLevel>('GCSE Higher')
  const [ocrTopic, setOcrTopic] = useState('')
  const [ocrSubTopic, setOcrSubTopic] = useState('')
  
  // Saving state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get cascading dropdown options
  const availableTopics = getTopicsForLevel(aiLevel)
  const availableSubTopics = aiTopic ? getSubTopicsForTopic(aiLevel, aiTopic) : []
  
  const ocrAvailableTopics = getTopicsForLevel(ocrLevel)
  const ocrAvailableSubTopics = ocrTopic ? getSubTopicsForTopic(ocrLevel, ocrTopic) : []

  /**
   * AI Generator: Construct rich prompt and call API
   */
  const handleGenerateQuestion = async () => {
    if (!aiLevel || !aiTopic || !aiSubTopic) {
      toast.error('MISSING FIELDS', {
        description: 'Please select Level, Topic, and Sub-Topic'
      })
      return
    }

    setAiLoading(true)
    setAiGenerated(null)
    setSaved(false)

    try {
      // Find the selected sub-topic name
      const topic = availableTopics.find(t => t.id === aiTopic)
      const subTopic = availableSubTopics.find(st => st.id === aiSubTopic)
      
      if (!topic || !subTopic) {
        throw new Error('Invalid topic or sub-topic selection')
      }

      // Construct rich, pedagogically-aware prompt
      const systemPrompt = `You are an expert UK mathematics exam question writer. Create a ${marks}-mark ${aiLevel} question.`
      
      const userPrompt = `
**Curriculum Context:**
- Level: ${aiLevel}
- Topic: ${topic.name}
- Sub-Topic: ${subTopic.name}

**Question Requirements:**
- Type: ${questionType}
- Marks: ${marks}
- Calculator: ${calculatorAllowed ? 'Calculator Allowed' : 'Non-Calculator'}
${userContext ? `- Real-world Context: ${userContext}` : ''}

**Instructions:**
${questionType === 'Fluency' ? '- Focus on procedural skills and standard techniques' : ''}
${questionType === 'Problem Solving' ? '- Include multi-step problem requiring application of knowledge' : ''}
${questionType === 'Reasoning/Proof' ? '- Require mathematical justification, proof, or explanation' : ''}
${aiLevel.includes('A-Level') || aiLevel === 'GCSE Higher' ? '- Use advanced LaTeX notation (\\frac, \\sqrt, \\int, etc.)' : ''}
${!calculatorAllowed ? '- Ensure the question can be solved without a calculator' : ''}

**Output Format (JSON):**
{
  "question_latex": "Question text with LaTeX notation using $ for inline math and $$ for display math",
  "answer": "Final answer",
  "explanation": "Step-by-step solution",
  "marks": ${marks}
}

Generate ONE unique, exam-style question now.
`.trim()

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text_gen',
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          level: aiLevel,
          topic: topic.name,
          sub_topic: subTopic.name,
          question_type: questionType,
          marks,
          calculator_allowed: calculatorAllowed,
          context: userContext,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate question')
      }

      setAiGenerated(data.data)
      setAiEditedLatex(data.data.question_latex)
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('GENERATION FAILED', {
        description: error instanceof Error ? error.message : 'Failed to generate question'
      })
    } finally {
      setAiLoading(false)
    }
  }

  /**
   * OCR: Handle file selection and upload to Supabase Storage
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('INVALID FILE TYPE', {
        description: 'Please select an image file'
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('FILE TOO LARGE', {
        description: 'Image must be smaller than 5MB'
      })
      return
    }

    setOcrResult(null)
    setSaved(false)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setOcrImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Supabase Storage
    await uploadImageToSupabase(file)
  }

  /**
   * Upload image to Supabase Storage and get public URL
   */
  const uploadImageToSupabase = async (file: File) => {
    setOcrUploading(true)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to 'question-images' bucket
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path)

      setOcrImageUrl(publicUrl)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('UPLOAD FAILED', {
        description: error instanceof Error ? error.message : 'Failed to upload image'
      })
    } finally {
      setOcrUploading(false)
    }
  }

  /**
   * OCR: Extract LaTeX from uploaded image
   */
  const handleExtractOCR = async () => {
    if (!ocrImageUrl) {
      toast.warning('UPLOAD IN PROGRESS', {
        description: 'Please wait for image upload to complete'
      })
      return
    }

    setOcrLoading(true)
    setOcrResult(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image_ocr',
          image_url: ocrImageUrl
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text')
      }

      setOcrResult(data.data)
      setOcrEditedLatex(data.data.question_latex)
    } catch (error) {
      console.error('OCR error:', error)
      toast.error('OCR EXTRACTION FAILED', {
        description: error instanceof Error ? error.message : 'Failed to extract text from image'
      })
    } finally {
      setOcrLoading(false)
    }
  }

  /**
   * Save question to database with full curriculum metadata
   */
  const handleSaveQuestion = async () => {
    setSaving(true)

    try {
      if (activeTab === 'ai') {
        // Save AI-generated question
        if (!aiGenerated) {
          throw new Error('No question to save')
        }

        const topic = availableTopics.find(t => t.id === aiTopic)
        const subTopic = availableSubTopics.find(st => st.id === aiSubTopic)

        if (!topic || !subTopic) {
          throw new Error('Please select topic and sub-topic')
        }

        // Use server action to create question
        const { createQuestion } = await import('@/app/actions/questions')
        
        const result = await createQuestion({
          content_type: 'generated_text',
          question_latex: aiEditedLatex,
          curriculum_level: aiLevel,
          topic: topic.name,
          sub_topic: subTopic.name,
          difficulty: aiLevel.includes('Foundation') ? 'Foundation' : 'Higher',
          marks: marks,
          question_type: questionType,
          calculator_allowed: calculatorAllowed,
          answer_key: {
            answer: aiGenerated.answer,
            explanation: aiGenerated.explanation,
          }
        })

        if (!result.success) {
          throw new Error(result.error)
        }

      } else {
        // Save OCR question with curriculum tagging
        if (!ocrResult) {
          throw new Error('No question to save')
        }

        if (!ocrImageUrl) {
          throw new Error('Image URL is missing')
        }

        const topic = ocrAvailableTopics.find(t => t.id === ocrTopic)
        const subTopic = ocrAvailableSubTopics.find(st => st.id === ocrSubTopic)

        if (!topic || !subTopic) {
          throw new Error('Please select topic and sub-topic for OCR question')
        }

        // Use server action to create question
        const { createQuestion } = await import('@/app/actions/questions')
        
        const result = await createQuestion({
          content_type: 'image_ocr',
          question_latex: ocrEditedLatex,
          image_url: ocrImageUrl,
          curriculum_level: ocrLevel,
          topic: topic.name,
          sub_topic: subTopic.name,
          difficulty: ocrLevel.includes('Foundation') ? 'Foundation' : 'Higher',
          marks: 0, // OCR doesn't extract marks, default to 0
          question_type: 'Fluency', // Default type for OCR
          calculator_allowed: true, // Default for OCR
          answer_key: {
            answer: '', // OCR doesn't extract answers
            explanation: 'Answer not yet added - please verify and update',
          }
        })

        if (!result.success) {
          throw new Error(result.error)
        }
      }

      setSaved(true)
      
      // Reset form immediately and show success message
      resetForm()
      
      // Show success toast
      toast.success('QUESTION SAVED', {
        description: 'Question saved to Bank successfully!'
      })

    } catch (error) {
      console.error('Save error:', error)
      toast.error('SAVE FAILED', {
        description: error instanceof Error ? error.message : 'Failed to save question'
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Reset form
   */
  const resetForm = () => {
    if (activeTab === 'ai') {
      setAiGenerated(null)
      setAiEditedLatex('')
      setUserContext('')
      setSaved(false)
    } else {
      setOcrImagePreview(null)
      setOcrImageUrl(null)
      setOcrResult(null)
      setOcrEditedLatex('')
      setSaved(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Reset sub-topic when topic changes
  const handleTopicChange = (topicId: string) => {
    setAiTopic(topicId)
    setAiSubTopic('') // Reset sub-topic
  }

  const handleOcrTopicChange = (topicId: string) => {
    setOcrTopic(topicId)
    setOcrSubTopic('') // Reset sub-topic
  }

  return (
    <Card className="border-2 border-swiss-ink bg-swiss-paper dark:bg-swiss-ink/5">
      <CardHeader className="border-b-2 border-swiss-ink dark:border-swiss-paper">
        <CardTitle className="text-2xl font-black uppercase tracking-wider text-swiss-ink dark:text-swiss-paper">
          CURRICULUM-AWARE QUESTION CREATOR
        </CardTitle>
        <CardDescription className="font-bold uppercase tracking-wider text-swiss-lead text-xs">
          Generate exam-specific questions with AI or digitize from images
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ai' | 'ocr')}>
          <TabsList className="bg-swiss-paper dark:bg-swiss-ink/10 border-2 border-swiss-ink dark:border-swiss-paper p-1 grid grid-cols-2">
            <TabsTrigger 
              value="ai"
              className="data-[state=active]:bg-swiss-signal data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm dark:text-swiss-paper"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI GENERATOR
            </TabsTrigger>
            <TabsTrigger 
              value="ocr"
              className="data-[state=active]:bg-swiss-signal data-[state=active]:text-swiss-paper font-bold uppercase tracking-wider text-sm dark:text-swiss-paper"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              SNIP & DIGITIZE
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AI GENERATOR - CURRICULUM AWARE */}
          <TabsContent value="ai" className="space-y-6 mt-6">
            {/* Curriculum Selection */}
            <div className="border-2 border-swiss-ink dark:border-swiss-paper p-4 bg-swiss-concrete dark:bg-swiss-paper/5">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-swiss-signal" />
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                  Curriculum Specification
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Level */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper flex items-center gap-2">
                    <BookOpen className="w-3 h-3" />
                    LEVEL
                  </Label>
                  <Select value={aiLevel} onValueChange={(v) => {
                    setAiLevel(v as CurriculumLevel)
                    setAiTopic('')
                    setAiSubTopic('')
                  }}>
                    <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllLevels().map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Topic */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    TOPIC
                  </Label>
                  <Select value={aiTopic} onValueChange={handleTopicChange} disabled={!aiLevel}>
                    <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTopics.map(topic => (
                        <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-Topic */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    SUB-TOPIC
                  </Label>
                  <Select value={aiSubTopic} onValueChange={setAiSubTopic} disabled={!aiTopic}>
                    <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper">
                      <SelectValue placeholder="Select sub-topic" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableSubTopics.map(subTopic => (
                        <SelectItem key={subTopic.id} value={subTopic.id}>
                          {subTopic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pedagogical Constraints */}
            <div className="border-2 border-swiss-ink dark:border-swiss-paper p-4 bg-swiss-paper dark:bg-swiss-ink/5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-swiss-signal" />
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                  Question Parameters
                </h3>
              </div>

              <div className="space-y-4">
                {/* Question Type & Marks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                      QUESTION TYPE
                    </Label>
                    <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
                      <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                      MARKS: {marks}
                    </Label>
                    <Slider
                      value={[marks]}
                      onValueChange={(v) => setMarks(v[0])}
                      min={1}
                      max={6}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-swiss-lead">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                      <span>6</span>
                    </div>
                  </div>
                </div>

                {/* Calculator Toggle */}
                <div className="flex items-center justify-between border-2 border-swiss-ink dark:border-swiss-paper p-3 bg-swiss-concrete dark:bg-swiss-paper/5">
                  <div className="flex items-center gap-3">
                    <CalculatorIcon className="w-5 h-5 text-swiss-ink dark:text-swiss-paper" />
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper cursor-pointer">
                        CALCULATOR ALLOWED
                      </Label>
                      <p className="text-xs text-swiss-lead">
                        {calculatorAllowed ? 'Question may require calculator' : 'Must be solvable without calculator'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={calculatorAllowed}
                    onCheckedChange={setCalculatorAllowed}
                  />
                </div>

                {/* User Context (Optional) */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                    REAL-WORLD CONTEXT (OPTIONAL)
                  </Label>
                  <Input
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="e.g., involving a ladder, financial interest, sports statistics..."
                    className="border-2 border-swiss-ink dark:border-swiss-paper"
                  />
                  <p className="text-xs text-swiss-lead">
                    Add context to make the question more engaging
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateQuestion}
              disabled={aiLoading || !aiLevel || !aiTopic || !aiSubTopic}
              className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider border-2 border-swiss-ink dark:border-swiss-paper h-12"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  GENERATING QUESTION...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  GENERATE {marks}-MARK QUESTION
                </>
              )}
            </Button>

            {/* Generated Question Display */}
            {aiGenerated && (
              <div className="space-y-4 border-2 border-swiss-ink dark:border-swiss-paper p-4 bg-swiss-concrete dark:bg-swiss-paper/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                    GENERATED QUESTION
                  </span>
                  <div className="flex gap-2">
                    <Badge className="bg-swiss-signal text-swiss-paper border-0">
                      {marks} MARKS
                    </Badge>
                    <Badge className="bg-swiss-ink dark:bg-swiss-paper text-swiss-paper dark:text-swiss-ink border-0">
                      {questionType}
                    </Badge>
                  </div>
                </div>

                {/* LaTeX Editor */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                    QUESTION (LATEX)
                  </Label>
                  <Textarea
                    value={aiEditedLatex}
                    onChange={(e) => setAiEditedLatex(e.target.value)}
                    rows={4}
                    className="border-2 border-swiss-ink dark:border-swiss-paper font-mono text-sm"
                  />
                </div>

                {/* LaTeX Preview */}
                {aiEditedLatex && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper flex items-center gap-2">
                      <Eye className="w-3 h-3" />
                      PREVIEW
                    </Label>
                    <div className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10 p-4 min-h-[4rem]">
                      <LatexPreview latex={aiEditedLatex} />
                    </div>
                  </div>
                )}

                {/* Answer & Explanation */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                      ANSWER
                    </Label>
                    <div className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10 p-3 min-h-[3rem]">
                      <LatexPreview latex={aiGenerated.answer} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                      EXPLANATION
                    </Label>
                    <div className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10 p-3 overflow-auto max-h-[6rem]">
                      <LatexPreview latex={aiGenerated.explanation} className="text-sm" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveQuestion}
                    disabled={saving || saved}
                    className="flex-1 bg-swiss-ink dark:bg-swiss-paper hover:bg-swiss-ink/90 dark:hover:bg-swiss-paper/90 text-swiss-paper dark:text-swiss-ink font-bold uppercase tracking-wider"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        SAVING...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        SAVED!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        SAVE TO DATABASE
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="border-2 border-swiss-ink dark:border-swiss-paper font-bold uppercase tracking-wider"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    NEW
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SNIP & DIGITIZE - With Curriculum Tagging */}
          <TabsContent value="ocr" className="space-y-6 mt-6">
            {/* Image Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-swiss-ink dark:border-swiss-paper p-8 text-center bg-swiss-concrete dark:bg-swiss-paper/5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {ocrImagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={ocrImagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto border-2 border-swiss-ink dark:border-swiss-paper"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="border-2 border-swiss-ink dark:border-swiss-paper font-bold uppercase tracking-wider"
                        disabled={ocrUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        CHANGE IMAGE
                      </Button>
                      {ocrImageUrl && !ocrResult && (
                        <Button
                          onClick={handleExtractOCR}
                          disabled={ocrLoading}
                          className="bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider"
                        >
                          {ocrLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              EXTRACTING...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              EXTRACT TEXT
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {ocrUploading && (
                      <p className="text-sm font-bold text-swiss-lead uppercase tracking-wider">
                        <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                        Uploading to storage...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 mx-auto text-swiss-lead" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-swiss-ink dark:text-swiss-paper mb-2">
                        UPLOAD QUESTION IMAGE
                      </p>
                      <p className="text-xs text-swiss-lead">
                        JPG, PNG or WebP • Max 5MB
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-swiss-signal hover:bg-swiss-signal/90 text-swiss-paper font-bold uppercase tracking-wider"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      SELECT IMAGE
                    </Button>
                  </div>
                )}
              </div>

              {/* Extracted Content & Curriculum Tagging */}
              {ocrResult && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original Image */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                        ORIGINAL IMAGE
                      </Label>
                      <div className="border-2 border-swiss-ink dark:border-swiss-paper p-2 bg-swiss-paper dark:bg-swiss-ink/10">
                        <img
                          src={ocrImagePreview!}
                          alt="Original"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Extracted LaTeX */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                          EXTRACTED LATEX
                        </Label>
                        <Badge className="bg-swiss-signal text-swiss-paper border-0">
                          EDITABLE
                        </Badge>
                      </div>
                      <Textarea
                        value={ocrEditedLatex}
                        onChange={(e) => setOcrEditedLatex(e.target.value)}
                        rows={6}
                        className="border-2 border-swiss-ink dark:border-swiss-paper font-mono text-sm"
                        placeholder="Extracted LaTeX will appear here..."
                      />
                      
                      {/* LaTeX Preview for OCR */}
                      {ocrEditedLatex && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            PREVIEW
                          </Label>
                          <div className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10 p-4 min-h-[4rem]">
                            <LatexPreview latex={ocrEditedLatex} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Curriculum Tagging for OCR */}
                  <div className="space-y-4 border-2 border-swiss-ink dark:border-swiss-paper p-4 bg-swiss-concrete dark:bg-swiss-paper/5">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-swiss-signal" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                        TAG WITH CURRICULUM DATA
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* OCR Level */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                          LEVEL
                        </Label>
                        <Select value={ocrLevel} onValueChange={(v) => {
                          setOcrLevel(v as CurriculumLevel)
                          setOcrTopic('')
                          setOcrSubTopic('')
                        }}>
                          <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllLevels().map(level => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* OCR Topic */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                          TOPIC
                        </Label>
                        <Select value={ocrTopic} onValueChange={handleOcrTopicChange}>
                          <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {ocrAvailableTopics.map(topic => (
                              <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* OCR Sub-Topic */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink dark:text-swiss-paper">
                          SUB-TOPIC
                        </Label>
                        <Select value={ocrSubTopic} onValueChange={setOcrSubTopic} disabled={!ocrTopic}>
                          <SelectTrigger className="border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink/10">
                            <SelectValue placeholder="Select sub-topic" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {ocrAvailableSubTopics.map(subTopic => (
                              <SelectItem key={subTopic.id} value={subTopic.id}>
                                {subTopic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Save Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveQuestion}
                        disabled={saving || saved || !ocrTopic}
                        className="flex-1 bg-swiss-ink dark:bg-swiss-paper hover:bg-swiss-ink/90 dark:hover:bg-swiss-paper/90 text-swiss-paper dark:text-swiss-ink font-bold uppercase tracking-wider"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            SAVING...
                          </>
                        ) : saved ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            SAVED!
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            SAVE TO DATABASE
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetForm}
                        variant="outline"
                        className="border-2 border-swiss-ink dark:border-swiss-paper font-bold uppercase tracking-wider"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        NEW
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
