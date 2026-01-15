/**
 * Questions Helper Functions
 * Server-side utilities for working with the questions table
 */

import { createClient } from '@/lib/supabase/server'
import type { Question, ContentType, DifficultyTier } from '@/lib/types/database'

/**
 * Upload image to Supabase Storage and return public URL
 */
export async function uploadQuestionImage(file: File): Promise<string> {
  const supabase = await createClient()

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

  return publicUrl
}

/**
 * Create a new question in the database
 */
export async function createQuestion(question: {
  content_type: ContentType
  question_latex: string
  image_url?: string
  topic: string
  difficulty: DifficultyTier
  meta_tags?: string[]
  answer_key?: Record<string, unknown>
  is_verified?: boolean
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('questions')
    .insert({
      ...question,
      created_by: user.id,
      is_verified: question.is_verified ?? false
    })
    .select()
    .single()

  if (error) throw error
  return data as Question
}

/**
 * Get all questions (with optional filters)
 */
export async function getQuestions(filters?: {
  topic?: string
  difficulty?: DifficultyTier
  content_type?: ContentType
  is_verified?: boolean
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.topic) {
    query = query.eq('topic', filters.topic)
  }
  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty)
  }
  if (filters?.content_type) {
    query = query.eq('content_type', filters.content_type)
  }
  if (filters?.is_verified !== undefined) {
    query = query.eq('is_verified', filters.is_verified)
  }
  if (filters?.search) {
    query = query.textSearch('search_vector', filters.search)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Question[]
}

/**
 * Get a single question by ID
 */
export async function getQuestion(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Question
}

/**
 * Update a question
 */
export async function updateQuestion(
  id: string,
  updates: {
    question_latex?: string
    topic?: string
    difficulty?: DifficultyTier
    meta_tags?: string[]
    answer_key?: Record<string, unknown>
    is_verified?: boolean
    verification_notes?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Question
}

/**
 * Delete a question
 */
export async function deleteQuestion(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get questions by teacher (created_by)
 */
export async function getMyQuestions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Question[]
}

/**
 * Get popular questions (most used)
 */
export async function getPopularQuestions(limit: number = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_verified', true)
    .order('times_used', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Question[]
}

/**
 * Get questions by topic (aggregated stats)
 */
export async function getQuestionsByTopic() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions_by_topic')
    .select('*')

  if (error) throw error
  return data
}

/**
 * Increment question usage count
 */
export async function incrementQuestionUsage(questionId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('increment_question_usage', {
    question_id: questionId
  })

  if (error) throw error
}

/**
 * Update question average score
 */
export async function updateQuestionScore(questionId: string, score: number) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('update_question_avg_score', {
    question_id: questionId,
    new_score: score
  })

  if (error) throw error
}

/**
 * Bulk create questions
 */
export async function bulkCreateQuestions(questions: Array<{
  content_type: ContentType
  question_latex: string
  image_url?: string
  topic: string
  difficulty: DifficultyTier
  meta_tags?: string[]
  answer_key?: Record<string, unknown>
}>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const questionsWithUser = questions.map(q => ({
    ...q,
    created_by: user.id,
    is_verified: false
  }))

  const { data, error } = await supabase
    .from('questions')
    .insert(questionsWithUser)
    .select()

  if (error) throw error
  return data as Question[]
}
