'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Filter, Eye, Trash2, CheckCircle2, Circle, Loader2, Triangle, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Question, DifficultyTier, ContentType } from '@/lib/types/database'
import { LatexPreview } from '@/components/latex-preview'

const TOPICS = [
  'All Topics',
  'Algebra',
  'Geometry',
  'Statistics',
  'Number',
  'Ratio & Proportion',
  'Probability',
  'Trigonometry',
  'Mensuration',
  'Graphs',
  'Transformations'
]

export default function QuestionBrowserClient() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('All Topics')
  const [selectedTier, setSelectedTier] = useState<'All' | DifficultyTier>('All')
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | ContentType>('all')
  const [hasDiagramFilter, setHasDiagramFilter] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (selectedTopic !== 'All Topics') {
      query = query.eq('topic', selectedTopic)
    }

    if (selectedTier !== 'All') {
      query = query.eq('difficulty', selectedTier)
    }

    if (verifiedFilter === 'verified') {
      query = query.eq('is_verified', true)
    } else if (verifiedFilter === 'unverified') {
      query = query.eq('is_verified', false)
    }

    // Source filter
    if (sourceFilter !== 'all') {
      query = query.eq('content_type', sourceFilter)
    }

    // Has diagram filter - questions with non-null image_url
    if (hasDiagramFilter) {
      query = query.not('image_url', 'is', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }

    setLoading(false)
  }, [selectedTopic, selectedTier, verifiedFilter, sourceFilter, hasDiagramFilter])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  // Filter by search term
  const filteredQuestions = questions.filter(q => {
    if (!searchTerm) return true
    return (
      q.question_latex?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Toggle verification status
  const toggleVerification = async (id: string, currentStatus: boolean) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('questions')
      .update({ is_verified: !currentStatus })
      .eq('id', id)

    if (!error) {
      setQuestions(questions.map(q => 
        q.id === id ? { ...q, is_verified: !currentStatus } : q
      ))
    }
  }

  // Delete question
  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (!error) {
      setQuestions(questions.filter(q => q.id !== id))
      setSelectedQuestion(null)
    }
  }

  return (
    <div className="min-h-screen bg-swiss-paper p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b-4 border-swiss-ink pb-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-swiss-ink">
            QUESTION BANK
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-swiss-lead mt-2">
            Browse, search, and manage questions
          </p>
        </div>

        {/* Filters */}
        <Card className="border-2 border-swiss-ink">
          <CardHeader className="border-b-2 border-swiss-ink">
            <CardTitle className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-5 h-5" />
              FILTERS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiss-lead" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="pl-10 border-2 border-swiss-ink"
                  />
                </div>
              </div>

              {/* Topic Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Topic
                </label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map(topic => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Tier
                </label>
                <Select value={selectedTier} onValueChange={(v) => setSelectedTier(v as 'All' | DifficultyTier)}>
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Tiers</SelectItem>
                    <SelectItem value="Foundation">Foundation</SelectItem>
                    <SelectItem value="Higher">Higher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Source
                </label>
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | ContentType)}>
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="official_past_paper">Official Past Papers</SelectItem>
                    <SelectItem value="generated_text">AI Generated (Text)</SelectItem>
                    <SelectItem value="synthetic_image">AI Generated (Diagrams)</SelectItem>
                    <SelectItem value="image_ocr">Image OCR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verified Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Status
                </label>
                <Select value={verifiedFilter} onValueChange={(v) => setVerifiedFilter(v as 'all' | 'verified' | 'unverified')}>
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Questions</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Has Diagram Toggle */}
            <div className="mt-4 pt-4 border-t border-swiss-concrete">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hasDiagramFilter}
                    onChange={(e) => setHasDiagramFilter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-swiss-concrete border-2 border-swiss-ink rounded-full peer-checked:bg-swiss-signal transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white border border-swiss-ink rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-swiss-lead group-hover:text-swiss-ink transition-colors" />
                  <span className="text-sm font-bold uppercase tracking-wider text-swiss-lead group-hover:text-swiss-ink transition-colors">
                    Has Diagram
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
            {filteredQuestions.length} Questions Found
          </p>
          <Button
            onClick={fetchQuestions}
            variant="outline"
            className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
          >
            REFRESH
          </Button>
        </div>

        {/* Questions Table */}
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-swiss-signal" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center p-12">
                <p className="text-swiss-lead font-bold uppercase tracking-wider">
                  No questions found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-swiss-ink">
                    <TableHead className="font-black uppercase text-swiss-ink">Question</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink">Topic</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink">Tier</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink">Type</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink">Status</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink">Usage</TableHead>
                    <TableHead className="font-black uppercase text-swiss-ink text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id} className="border-b border-swiss-concrete">
                      <TableCell className="font-mono text-sm max-w-md truncate">
                        {question.question_latex || 'No LaTeX'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-2 border-swiss-ink">
                          {question.topic}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={question.difficulty === 'Higher' 
                            ? 'border-2 border-swiss-signal text-swiss-signal' 
                            : 'border-2 border-swiss-ink'}
                        >
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          {question.content_type === 'synthetic_image' && (
                            <Triangle className="w-3 h-3 text-swiss-signal fill-swiss-signal" />
                          )}
                          {question.image_url && question.content_type !== 'synthetic_image' && (
                            <ImageIcon className="w-3 h-3 text-swiss-lead" />
                          )}
                          <span>
                            {question.content_type === 'image_ocr' ? 'OCR' : 
                             question.content_type === 'synthetic_image' ? 'AI Diagram' : 
                             question.content_type === 'official_past_paper' ? 'Past Paper' : 'AI Gen'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleVerification(question.id, question.is_verified)}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors"
                        >
                          {question.is_verified ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-swiss-signal" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 text-swiss-lead" />
                              Unverified
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs">
                        {question.times_used}x
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedQuestion(question)}
                            className="border-2 border-swiss-ink"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteQuestion(question.id)}
                            className="border-2 border-swiss-signal text-swiss-signal hover:bg-swiss-signal hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Question Preview Modal */}
        {selectedQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="border-4 border-swiss-ink max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b-2 border-swiss-ink">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-wider text-swiss-ink">
                      QUESTION PREVIEW
                    </CardTitle>
                    <CardDescription className="flex gap-2 mt-2">
                      <Badge variant="outline" className="border-2 border-swiss-ink">
                        {selectedQuestion.topic}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={selectedQuestion.difficulty === 'Higher' 
                          ? 'border-2 border-swiss-signal text-swiss-signal' 
                          : 'border-2 border-swiss-ink'}
                      >
                        {selectedQuestion.difficulty}
                      </Badge>
                      {selectedQuestion.is_verified && (
                        <Badge className="bg-swiss-signal text-white border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          VERIFIED
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuestion(null)}
                    className="border-2 border-swiss-ink"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Question Display */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                    Question
                  </label>
                  <div className="border-2 border-swiss-ink bg-white p-4">
                    <LatexPreview latex={selectedQuestion.question_latex || ''} />
                  </div>
                </div>

                {/* Raw LaTeX */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                    Raw LaTeX
                  </label>
                  <div className="border-2 border-swiss-ink bg-swiss-concrete p-4 font-mono text-sm overflow-x-auto">
                    {selectedQuestion.question_latex}
                  </div>
                </div>

                {/* Image (if OCR or synthetic_image) */}
                {(selectedQuestion.content_type === 'image_ocr' || selectedQuestion.content_type === 'official_past_paper') && selectedQuestion.image_url && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                      Original Image
                    </label>
                    <div className="border-2 border-swiss-ink p-2 bg-white">
                      <Image
                        src={selectedQuestion.image_url}
                        alt="Original question"
                        width={700}
                        height={500}
                        className="w-full h-auto"
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                    </div>
                  </div>
                )}

                {/* Synthetic Image: Show text first, then diagram */}
                {selectedQuestion.content_type === 'synthetic_image' && selectedQuestion.image_url && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                        AI Generated Diagram
                      </label>
                      <Badge variant="outline" className="border-2 border-swiss-signal text-swiss-signal text-[10px]">
                        AI Diagram
                      </Badge>
                    </div>
                    <div className="border-2 border-swiss-ink p-2 bg-white">
                      <Image
                        src={selectedQuestion.image_url}
                        alt="AI generated diagram"
                        width={500}
                        height={400}
                        className="w-full max-w-md mx-auto h-auto"
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                    </div>
                  </div>
                )}

                {/* Answer Key (if available) */}
                {selectedQuestion.answer_key && (
                  <div className="space-y-4">
                    {/* Answer */}
                    {selectedQuestion.answer_key.answer && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                          Answer
                        </label>
                        <div className="border-2 border-swiss-ink bg-swiss-concrete p-3">
                          <LatexPreview 
                            latex={selectedQuestion.answer_key.answer} 
                            className="text-sm font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {selectedQuestion.answer_key.explanation && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                          Explanation
                        </label>
                        <div className="border-2 border-swiss-ink bg-swiss-concrete p-3 max-h-[12rem] overflow-auto">
                          <LatexPreview 
                            latex={selectedQuestion.answer_key.explanation} 
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* Marks (if available) */}
                    {selectedQuestion.answer_key.marks && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                          Marks
                        </label>
                        <div className="border-2 border-swiss-ink bg-swiss-concrete px-3 py-2">
                          <span className="text-sm font-bold uppercase text-swiss-signal">
                            {selectedQuestion.answer_key.marks} MARK{selectedQuestion.answer_key.marks > 1 ? 'S' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Curriculum Info (if available) */}
                    {selectedQuestion.answer_key.curriculum && (
                      <details className="space-y-2">
                        <summary className="text-xs font-bold uppercase tracking-widest text-swiss-lead cursor-pointer hover:text-swiss-ink transition-colors">
                          Curriculum Metadata (Click to expand)
                        </summary>
                        <div className="border-2 border-swiss-ink bg-swiss-concrete p-3 mt-2">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {JSON.stringify(selectedQuestion.answer_key.curriculum, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 border-t-2 border-swiss-ink pt-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                      Content Type
                    </p>
                    <p className="text-sm font-bold uppercase">
                      {selectedQuestion.content_type === 'image_ocr' ? 'Image OCR' : 
                       selectedQuestion.content_type === 'synthetic_image' ? 'AI Diagram' :
                       selectedQuestion.content_type === 'official_past_paper' ? 'Past Paper' : 'AI Generated'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                      Times Used
                    </p>
                    <p className="text-sm font-bold uppercase">
                      {selectedQuestion.times_used}x
                    </p>
                  </div>
                  {selectedQuestion.avg_score !== null && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                        Average Score
                      </p>
                      <p className="text-sm font-bold uppercase">
                        {(selectedQuestion.avg_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                      Created
                    </p>
                    <p className="text-sm font-bold">
                      {new Date(selectedQuestion.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t-2 border-swiss-ink pt-4">
                  <Button
                    onClick={() => toggleVerification(selectedQuestion.id, selectedQuestion.is_verified)}
                    className={`flex-1 text-white font-bold uppercase tracking-wider ${
                      selectedQuestion.is_verified 
                        ? 'bg-swiss-lead hover:bg-swiss-lead/90' 
                        : 'bg-swiss-signal hover:bg-swiss-signal/90'
                    }`}
                  >
                    {selectedQuestion.is_verified ? 'UNVERIFY' : 'VERIFY'}
                  </Button>
                  <Button
                    onClick={() => {
                      deleteQuestion(selectedQuestion.id)
                    }}
                    variant="outline"
                    className="border-2 border-swiss-signal text-swiss-signal hover:bg-swiss-signal hover:text-white font-bold uppercase tracking-wider"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    DELETE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
