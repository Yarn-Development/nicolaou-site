/**
 * Assessment Helper Functions
 * Server-side utilities for working with assessments
 */

import { createClient } from '@/lib/supabase/server'
import type { Assessment, AssessmentQuestion, StudentAssessment, GradedQuestion } from '@/lib/types/database'

/**
 * Get all assessments for the current teacher
 */
export async function getTeacherAssessments() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Assessment[]
}

/**
 * Get a single assessment with its questions
 */
export async function getAssessmentWithQuestions(assessmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      assessment_questions (*)
    `)
    .eq('id', assessmentId)
    .single()

  if (error) throw error
  return data as Assessment & { assessment_questions: AssessmentQuestion[] }
}

/**
 * Create a new assessment
 */
export async function createAssessment(assessment: {
  title: string
  description?: string
  tier: 'foundation' | 'higher'
  topic: string
  duration_minutes?: number
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      ...assessment,
      teacher_id: user.id,
      status: 'draft'
    })
    .select()
    .single()

  if (error) throw error
  return data as Assessment
}

/**
 * Add questions to an assessment
 */
export async function addQuestionsToAssessment(
  assessmentId: string,
  questions: Array<{
    question_number: number
    question_text: string
    question_type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'calculation'
    max_marks: number
    learning_objective: string
    options?: string[]
    correct_answer?: string
    difficulty_level?: string
    calculator_allowed?: boolean
  }>
) {
  const supabase = await createClient()

  const questionsToInsert = questions.map(q => ({
    ...q,
    assessment_id: assessmentId
  }))

  const { data, error } = await supabase
    .from('assessment_questions')
    .insert(questionsToInsert)
    .select()

  if (error) throw error
  return data as AssessmentQuestion[]
}

/**
 * Assign assessment to students
 */
export async function assignAssessmentToStudents(
  assessmentId: string,
  studentIds: string[],
  dueDate?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const assignments = studentIds.map(studentId => ({
    assessment_id: assessmentId,
    student_id: studentId,
    assigned_by: user.id,
    due_date: dueDate || null,
    grading_status: 'pending' as const
  }))

  const { data, error } = await supabase
    .from('student_assessments')
    .insert(assignments)
    .select()

  if (error) throw error
  return data as StudentAssessment[]
}

/**
 * Get student's assigned assessments
 */
export async function getStudentAssessments(studentId?: string) {
  const supabase = await createClient()
  
  let userId = studentId
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    userId = user.id
  }

  const { data, error } = await supabase
    .from('student_assessments')
    .select(`
      *,
      assessments (*)
    `)
    .eq('student_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}

/**
 * Submit graded questions for a student assessment
 */
export async function submitGradedQuestions(
  studentAssessmentId: string,
  gradedQuestions: Array<{
    question_id: string
    question_number: number
    learning_objective: string
    student_answer?: string
    marks_awarded: number
    max_marks: number
    feedback?: string
  }>
) {
  const supabase = await createClient()

  const questionsToInsert = gradedQuestions.map(q => ({
    ...q,
    student_assessment_id: studentAssessmentId
  }))

  const { data, error } = await supabase
    .from('graded_questions')
    .insert(questionsToInsert)
    .select()

  if (error) throw error

  // Calculate total marks
  const totalMarksAwarded = gradedQuestions.reduce((sum, q) => sum + q.marks_awarded, 0)

  // Update student assessment with total marks
  const { error: updateError } = await supabase
    .from('student_assessments')
    .update({
      total_marks_awarded: totalMarksAwarded,
      grading_status: 'completed',
      graded_at: new Date().toISOString()
    })
    .eq('id', studentAssessmentId)

  if (updateError) throw updateError

  return data as GradedQuestion[]
}

/**
 * Get graded questions for a student assessment (for feedback sheet)
 */
export async function getGradedQuestions(studentAssessmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('graded_questions')
    .select('*')
    .eq('student_assessment_id', studentAssessmentId)
    .order('question_number', { ascending: true })

  if (error) throw error
  return data as GradedQuestion[]
}

/**
 * Get student assessment details with all data needed for feedback sheet
 */
export async function getStudentAssessmentForFeedback(studentAssessmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_assessments')
    .select(`
      *,
      assessments (*),
      graded_questions (*)
    `)
    .eq('id', studentAssessmentId)
    .single()

  if (error) throw error
  return data
}

/**
 * Publish an assessment (change from draft to published)
 */
export async function publishAssessment(assessmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assessments')
    .update({ status: 'published' })
    .eq('id', assessmentId)
    .select()
    .single()

  if (error) throw error
  return data as Assessment
}

/**
 * Get all students who have completed a specific assessment
 */
export async function getAssessmentResults(assessmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_assessments')
    .select(`
      *,
      profiles:student_id (
        full_name,
        email
      )
    `)
    .eq('assessment_id', assessmentId)
    .eq('grading_status', 'completed')
    .order('percentage_score', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data
}
