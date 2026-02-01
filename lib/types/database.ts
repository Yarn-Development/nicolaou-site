/**
 * Database Types
 * These match the Supabase schema
 */

export type UserRole = 'student' | 'teacher' | 'admin'
export type AssessmentStatus = 'draft' | 'published' | 'archived'
export type AssessmentTier = 'foundation' | 'higher'
export type QuestionType = 'multiple_choice' | 'short_answer' | 'long_answer' | 'calculation'
export type GradingStatus = 'pending' | 'in_progress' | 'completed'
export type ContentType = 'image_ocr' | 'generated_text' | 'official_past_paper' | 'synthetic_image' | 'revision_generated'
export type DifficultyTier = 'Foundation' | 'Higher'

// External Paper Mapper types
export type AssignmentSourceType = 'bank_builder' | 'external_upload'
export type AssignmentMode = 'online' | 'paper'
export type RevisionAllocationStatus = 'pending' | 'in_progress' | 'completed'

// Answer key structure for questions
export interface QuestionAnswerKey {
  answer?: string
  explanation?: string
  marks?: number
  type?: 'generated' | 'manual' | 'ocr'
  curriculum?: {
    level?: string
    topic?: string
    topic_id?: string
    sub_topic?: string
    sub_topic_id?: string
    question_type?: string
    calculator_allowed?: boolean
    context?: string | null
  }
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Assessment {
  id: string
  title: string
  description: string | null
  teacher_id: string
  tier: AssessmentTier
  topic: string
  total_marks: number
  duration_minutes: number | null
  status: AssessmentStatus
  assigned_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_number: number
  question_text: string
  question_type: QuestionType
  max_marks: number
  learning_objective: string
  options: string[] | null // For multiple choice
  correct_answer: string | null
  difficulty_level: string | null
  calculator_allowed: boolean
  created_at: string
}

export interface StudentAssessment {
  id: string
  assessment_id: string
  student_id: string
  assigned_by: string
  assigned_date: string
  due_date: string | null
  started_at: string | null
  submitted_at: string | null
  grading_status: GradingStatus
  graded_by: string | null
  graded_at: string | null
  total_marks_awarded: number | null
  percentage_score: number | null
  grade: string | null
  overall_feedback: string | null
  created_at: string
  updated_at: string
}

export interface GradedQuestion {
  id: string
  student_assessment_id: string
  question_id: string
  student_answer: string | null
  student_work: Record<string, unknown> | null
  marks_awarded: number
  max_marks: number
  feedback: string | null
  question_number: number
  learning_objective: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  created_at: string
  updated_at: string
  content_type: ContentType
  question_latex: string | null
  image_url: string | null
  topic: string
  difficulty: DifficultyTier
  meta_tags: string[]
  answer_key: QuestionAnswerKey | null
  created_by: string | null
  is_verified: boolean
  verification_notes: string | null
  times_used: number
  avg_score: number | null
  // NEW: Curriculum-aware fields
  curriculum_level: string | null
  topic_name: string | null
  sub_topic_name: string | null
  question_type: 'Fluency' | 'Problem Solving' | 'Reasoning/Proof' | null
  marks: number | null
  calculator_allowed: boolean | null
  // Helper property for diagram questions
  is_diagram_question?: boolean
}

// =====================================================
// Assignment types (for assignments table)
// =====================================================

export interface Assignment {
  id: string
  class_id: string
  title: string
  due_date: string | null
  status: 'draft' | 'published'
  mode: AssignmentMode
  source_type: AssignmentSourceType
  resource_url: string | null
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

// =====================================================
// Assignment Questions types (ghost question support)
// =====================================================

export interface AssignmentQuestionItem {
  id: string
  assignment_id: string
  question_id: string | null  // Nullable for ghost questions
  order_index: number
  custom_marks: number | null
  // Ghost question fields (used when question_id is null)
  custom_question_number: string | null
  custom_topic: string | null
  custom_sub_topic: string | null
  created_at: string
}

/**
 * Result from get_assignment_questions RPC function
 * Supports both bank questions and ghost questions (external papers)
 */
export interface AssignmentQuestionResult {
  question_id: string
  order_index: number
  marks: number
  question_latex: string
  topic: string
  sub_topic: string
  difficulty: string
  question_type: string
  calculator_allowed: boolean
  answer_key: Record<string, unknown>
  custom_question_number: string | null
  is_ghost: boolean
}

// =====================================================
// Submission types
// =====================================================

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  score: number | null
  status: 'submitted' | 'graded' | 'in_progress'
  answers: Record<string, unknown>
  grading_data: Record<string, { score: number }> | null
  submitted_at: string
  graded_at: string | null
  feedback_released: boolean
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      assessments: {
        Row: Assessment
        Insert: Omit<Assessment, 'id' | 'created_at' | 'updated_at' | 'total_marks'>
        Update: Partial<Omit<Assessment, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>>
      }
      assessment_questions: {
        Row: AssessmentQuestion
        Insert: Omit<AssessmentQuestion, 'id' | 'created_at'>
        Update: Partial<Omit<AssessmentQuestion, 'id' | 'assessment_id' | 'created_at'>>
      }
      student_assessments: {
        Row: StudentAssessment
        Insert: Omit<StudentAssessment, 'id' | 'created_at' | 'updated_at' | 'percentage_score'>
        Update: Partial<Omit<StudentAssessment, 'id' | 'assessment_id' | 'student_id' | 'created_at'>>
      }
      graded_questions: {
        Row: GradedQuestion
        Insert: Omit<GradedQuestion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<GradedQuestion, 'id' | 'student_assessment_id' | 'question_id' | 'created_at'>>
      }
      questions: {
        Row: Question
        Insert: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'times_used' | 'avg_score'>
        Update: Partial<Omit<Question, 'id' | 'created_at'>>
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Assignment, 'id' | 'created_at'>>
      }
      assignment_questions: {
        Row: AssignmentQuestionItem
        Insert: Omit<AssignmentQuestionItem, 'id' | 'created_at'>
        Update: Partial<Omit<AssignmentQuestionItem, 'id' | 'assignment_id' | 'created_at'>>
      }
      submissions: {
        Row: Submission
        Insert: Omit<Submission, 'id' | 'submitted_at'>
        Update: Partial<Omit<Submission, 'id' | 'assignment_id' | 'student_id' | 'submitted_at'>>
      }
    }
    Enums: {
      user_role: UserRole
      assessment_status: AssessmentStatus
      assessment_tier: AssessmentTier
      question_type: QuestionType
      grading_status: GradingStatus
      content_type: ContentType
      difficulty_tier: DifficultyTier
      assignment_source_type: AssignmentSourceType
      assignment_mode: AssignmentMode
      revision_allocation_status: RevisionAllocationStatus
    }
  }
}

// =====================================================
// Revision List types
// =====================================================

export interface RevisionList {
  id: string
  assignment_id: string | null
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RevisionListQuestion {
  id: string
  revision_list_id: string
  question_id: string
  source_question_number: string | null
  source_question_latex: string | null
  order_index: number
  created_at: string
}

export interface StudentRevisionAllocation {
  id: string
  revision_list_id: string
  student_id: string
  status: RevisionAllocationStatus
  allocated_at: string
  started_at: string | null
  completed_at: string | null
  progress: Record<string, { completed: boolean; completed_at?: string }>
}

// Result type from get_student_revision_lists function
export interface StudentRevisionListResult {
  revision_list_id: string
  title: string
  description: string | null
  assignment_id: string | null
  assignment_title: string | null
  class_name: string | null
  status: RevisionAllocationStatus
  allocated_at: string
  total_questions: number
  completed_questions: number
  created_at: string
}

// Result type from get_revision_list_questions function
export interface RevisionListQuestionResult {
  question_id: string
  order_index: number
  source_question_number: string | null
  source_question_latex: string | null
  question_latex: string | null
  image_url: string | null
  topic: string
  sub_topic: string | null
  difficulty: string
  marks: number | null
  answer_key: QuestionAnswerKey | null
  calculator_allowed: boolean | null
}

// =====================================================
// Extracted Question type (for PDF extraction step)
// =====================================================

export interface ExtractedQuestion {
  id: string // temporary client-side ID
  questionNumber: string // e.g., "1a", "2", "3b(ii)"
  questionLatex: string
  suggestedTopic: string
  suggestedSubTopic: string
  suggestedMarks: number
  suggestedDifficulty: DifficultyTier
  pageNumber: number
  included: boolean // whether to include in generation
}

// =====================================================
// Generated Similar Question type
// =====================================================

export interface GeneratedSimilarQuestion {
  id: string // temporary client-side ID
  sourceQuestionNumber: string // which original it came from
  sourceQuestionLatex: string
  questionLatex: string
  answerKey: {
    answer: string
    explanation: string
  }
  topic: string
  subTopic: string
  difficulty: DifficultyTier
  marks: number
  included: boolean // whether to save to bank
}

