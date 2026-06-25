'use server'

import { getAuthUser } from '@/lib/auth'
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from '@/lib/convex/server'
import type { Id } from '@/convex/_generated/dataModel'

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
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<'users'> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

// =====================================================
// Save a question to personal bank
// =====================================================

export async function saveQuestionToBank(
  questionId: string,
  folder: string = 'General',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // `folder` and `notes` are retained in the signature for compatibility but
  // are not persisted: the Convex savedQuestions schema has no such columns.
  void folder
  void notes
  try {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: 'You must be logged in' }

    await fetchMutation(api.savedQuestions.saveQuestion, {
      userId,
      questionId: questionId as Id<'questions'>,
    })

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
    const userId = await currentUserId()
    if (!userId) return { success: false, error: 'You must be logged in' }

    await fetchMutation(api.savedQuestions.unsaveQuestion, {
      userId,
      questionId: questionId as Id<'questions'>,
    })

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
    const userId = await currentUserId()
    if (!userId) return { success: false, error: 'You must be logged in' }

    const rows = await fetchQuery(api.savedQuestions.getSavedQuestions, { userId })

    // Folders are not persisted in Convex; every saved question is "General".
    let savedQuestions: SavedQuestion[] = rows.map((item) => ({
      id: item.id,
      question_id: item.questionId,
      folder: 'General',
      notes: null,
      created_at: new Date(item.savedAt).toISOString(),
      question_latex: item.questionLatex || '',
      topic: item.topic || '',
      sub_topic: item.subTopic || '',
      difficulty: item.difficulty || '',
      marks: item.marks || 0,
      content_type: item.contentType || 'generated_text',
    }))

    if (folder && folder !== 'all') {
      savedQuestions = savedQuestions.filter((q) => q.folder === folder)
    }

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
    const userId = await currentUserId()
    if (!userId) return { success: false, error: 'You must be logged in' }

    // Folders are not persisted in Convex; all saved questions live in "General".
    const ids = await fetchQuery(api.savedQuestions.getSavedQuestionIds, { userId })
    const folders = ids.length > 0 ? ['General'] : []
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
    const userId = await currentUserId()
    if (!userId) return false

    return await fetchQuery(api.savedQuestions.isQuestionSaved, {
      userId,
      questionId: questionId as Id<'questions'>,
    })
  } catch {
    return false
  }
}

// =====================================================
// Get saved question IDs (for bulk checking)
// =====================================================

export async function getSavedQuestionIds(): Promise<string[]> {
  try {
    const userId = await currentUserId()
    if (!userId) return []

    return await fetchQuery(api.savedQuestions.getSavedQuestionIds, { userId })
  } catch {
    return []
  }
}
