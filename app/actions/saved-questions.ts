'use server'

import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/helpers'

// =====================================================
// Types
// =====================================================

export interface SavedQuestion {
  id: string
  question_id: string
  folder: string
  notes: string | null
  created_at: string
  // Joined question data
  question_latex: string
  topic: string
  sub_topic: string
  difficulty: string
  marks: number
  content_type: string
}

// =====================================================
// Save a question to personal bank
// =====================================================

export async function saveQuestionToBank(
  questionId: string,
  folder: string = 'General',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    const { error } = await supabase
      .from('saved_questions')
      .upsert(
        {
          teacher_id: user.id,
          question_id: questionId,
          folder,
          notes: notes || null,
        },
        { onConflict: 'teacher_id,question_id' }
      )

    if (error) {
      console.error('Failed to save question:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save question' }
  }
}

// =====================================================
// Remove a question from personal bank
// =====================================================

export async function removeQuestionFromBank(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    const { error } = await supabase
      .from('saved_questions')
      .delete()
      .eq('teacher_id', user.id)
      .eq('question_id', questionId)

    if (error) {
      console.error('Failed to remove saved question:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove question' }
  }
}

// =====================================================
// Get all saved questions for the current teacher
// =====================================================

export async function getSavedQuestions(
  folder?: string
): Promise<{ success: boolean; data?: SavedQuestion[]; error?: string }> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    let query = supabase
      .from('saved_questions')
      .select(`
        id,
        question_id,
        folder,
        notes,
        created_at,
        questions (
          question_latex,
          topic,
          sub_topic,
          difficulty,
          marks,
          content_type
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (folder && folder !== 'all') {
      query = query.eq('folder', folder)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch saved questions:', error)
      return { success: false, error: error.message }
    }

    // Flatten the joined data
    const savedQuestions: SavedQuestion[] = (data || []).map((item: Record<string, unknown>) => {
      const q = item.questions as Record<string, unknown> | null
      return {
        id: item.id as string,
        question_id: item.question_id as string,
        folder: item.folder as string,
        notes: item.notes as string | null,
        created_at: item.created_at as string,
        question_latex: (q?.question_latex as string) || '',
        topic: (q?.topic as string) || '',
        sub_topic: (q?.sub_topic as string) || '',
        difficulty: (q?.difficulty as string) || '',
        marks: (q?.marks as number) || 0,
        content_type: (q?.content_type as string) || 'generated_text',
      }
    })

    return { success: true, data: savedQuestions }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch saved questions' }
  }
}

// =====================================================
// Get saved question folders for the current teacher
// =====================================================

export async function getSavedFolders(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_questions')
      .select('folder')
      .eq('teacher_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    const folders = [...new Set((data || []).map(d => d.folder as string))].sort()
    return { success: true, data: folders }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch folders' }
  }
}

// =====================================================
// Check if a question is saved
// =====================================================

export async function isQuestionSaved(
  questionId: string
): Promise<boolean> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_questions')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle()

    if (error) return false
    return !!data
  } catch {
    return false
  }
}

// =====================================================
// Get saved question IDs (for bulk checking)
// =====================================================

export async function getSavedQuestionIds(): Promise<string[]> {
  try {
    const user = await requireTeacher()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_questions')
      .select('question_id')
      .eq('teacher_id', user.id)

    if (error) return []
    return (data || []).map(d => d.question_id)
  } catch {
    return []
  }
}
