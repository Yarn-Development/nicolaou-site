# Assessment System Documentation

## Overview

The Assessment System enables teachers to create exams, assign them to students, grade them, and generate detailed feedback sheets automatically.

## Database Schema

### Tables

1. **assessments** - Exams/tests created by teachers
2. **assessment_questions** - Individual questions within each assessment
3. **student_assessments** - Links students to assigned assessments
4. **graded_questions** - Stores individual question results (powers feedback sheets)

### Entity Relationships

```
assessments (1) ──── (many) assessment_questions
                │
                │
                └──── (many) student_assessments (1) ──── (many) graded_questions
```

---

## Setup Instructions

### 1. Run the Migration

In your Supabase SQL Editor, run:

```sql
-- Run this file:
supabase/migrations/003_assessments_schema.sql
```

This creates:
- ✅ All tables with proper relationships
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Automatic triggers for calculations
- ✅ Helper functions

### 2. Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'assessment%' 
OR table_name = 'student_assessments' 
OR table_name = 'graded_questions';
```

You should see:
- `assessments`
- `assessment_questions`
- `student_assessments`
- `graded_questions`

---

## Workflow

### Teacher Workflow

#### 1. Create an Assessment

```typescript
import { createAssessment } from '@/lib/assessments/helpers'

const assessment = await createAssessment({
  title: "GCSE Module 5: Quadratic Equations",
  description: "Assessment covering solving quadratics",
  tier: "higher",
  topic: "Algebra",
  duration_minutes: 45
})
```

#### 2. Add Questions

```typescript
import { addQuestionsToAssessment } from '@/lib/assessments/helpers'

await addQuestionsToAssessment(assessment.id, [
  {
    question_number: 1,
    question_text: "Solve x² + 5x + 6 = 0 by factoring",
    question_type: "short_answer",
    max_marks: 3,
    learning_objective: "Solve quadratic equations by factoring",
    difficulty_level: "easy",
    calculator_allowed: true
  },
  {
    question_number: 2,
    question_text: "Use the quadratic formula to solve 2x² - 7x + 3 = 0",
    question_type: "calculation",
    max_marks: 5,
    learning_objective: "Apply the quadratic formula",
    difficulty_level: "medium",
    calculator_allowed: true
  }
])
```

#### 3. Publish Assessment

```typescript
import { publishAssessment } from '@/lib/assessments/helpers'

await publishAssessment(assessment.id)
```

#### 4. Assign to Students

```typescript
import { assignAssessmentToStudents } from '@/lib/assessments/helpers'

const studentIds = ['uuid-1', 'uuid-2', 'uuid-3']

await assignAssessmentToStudents(
  assessment.id,
  studentIds,
  '2026-01-20T23:59:59Z' // Optional due date
)
```

#### 5. Grade Student Work

```typescript
import { submitGradedQuestions } from '@/lib/assessments/helpers'

await submitGradedQuestions(studentAssessmentId, [
  {
    question_id: "q1-uuid",
    question_number: 1,
    learning_objective: "Solve quadratic equations by factoring",
    student_answer: "x = -2, x = -3",
    marks_awarded: 3,
    max_marks: 3,
    feedback: "Perfect! Correctly factored and solved."
  },
  {
    question_id: "q2-uuid",
    question_number: 2,
    learning_objective: "Apply the quadratic formula",
    student_answer: "x = 3, x = 0.5",
    marks_awarded: 4,
    max_marks: 5,
    feedback: "Correct answers but minor calculation error in showing work."
  }
])
```

#### 6. Generate Feedback Sheet

```typescript
import { getGradedQuestions } from '@/lib/assessments/helpers'
import { FeedbackSheet } from '@/components/feedback-sheet'

const gradedQuestions = await getGradedQuestions(studentAssessmentId)

// In your component:
<FeedbackSheet
  questions={gradedQuestions.map(gq => ({
    id: gq.id,
    maxMarks: gq.max_marks,
    studentMarks: gq.marks_awarded,
    learningObjective: gq.learning_objective,
    questionNumber: gq.question_number
  }))}
  studentName="Alex Johnson"
  assessmentTitle="GCSE Module 5: Quadratic Equations"
  assessmentDate="13th January 2026"
/>
```

### Student Workflow

#### 1. View Assigned Assessments

```typescript
import { getStudentAssessments } from '@/lib/assessments/helpers'

const assignments = await getStudentAssessments()
// Returns assessments with due dates, status, etc.
```

#### 2. View Feedback

```typescript
import { getStudentAssessmentForFeedback } from '@/lib/assessments/helpers'

const feedback = await getStudentAssessmentForFeedback(studentAssessmentId)
// Returns complete feedback with graded questions
```

---

## Database Automatic Features

### Auto-Calculated Fields

#### Total Marks
When questions are added/updated/deleted, the assessment's `total_marks` is automatically recalculated:

```sql
-- Automatic via trigger
-- No manual calculation needed!
```

#### Percentage Score
When `total_marks_awarded` is set, percentage is auto-calculated:

```sql
-- Happens automatically via trigger
UPDATE student_assessments 
SET total_marks_awarded = 28
WHERE id = 'student-assessment-uuid';
-- percentage_score will be calculated automatically (e.g., 93.33%)
```

#### Updated Timestamps
All `updated_at` fields are automatically maintained.

---

## RAG Status Calculation

The Feedback Sheet component automatically calculates RAG (Red-Amber-Green) status:

- **🔴 Red (Needs Work):** < 40%
- **🟠 Amber (Developing):** 40% - 70%
- **🟢 Green (Strong):** > 70%

This is calculated both per-question and per-learning-objective.

---

## Security (RLS Policies)

### Teachers Can:
- ✅ View their own assessments
- ✅ Create new assessments
- ✅ Update their own assessments
- ✅ Delete draft assessments only
- ✅ View/grade assignments they created
- ✅ Add/edit questions on their assessments

### Students Can:
- ✅ View their own assigned assessments
- ✅ View their own graded questions
- ✅ Update submission status (mark as submitted)
- ❌ Cannot view other students' work
- ❌ Cannot modify grades

### Database Enforces:
- Students can only access their own data
- Teachers can only access their own assessments
- No cross-contamination of data

---

## API Examples

### Get All Assessments for Teacher Dashboard

```typescript
const assessments = await getTeacherAssessments()

// Returns:
// [
//   {
//     id: "uuid",
//     title: "Module 5 Assessment",
//     status: "published",
//     total_marks: 30,
//     ...
//   }
// ]
```

### Get Assessment Results (Class Overview)

```typescript
const results = await getAssessmentResults(assessmentId)

// Returns all students who completed the assessment
// with their scores, sorted by percentage
```

### Check Student Progress

```typescript
const studentData = await getStudentAssessments(studentId)

// Returns:
// - Pending assessments
// - Submitted but ungraded
// - Completed with feedback
```

---

## Integration with Existing Components

### With Exam Builder

The exam builder (`app/dashboard/exam-builder/page.tsx`) can be updated to:

1. Save questions to `assessments` table
2. Assign to students
3. Track submissions

### With Feedback Sheet

The feedback sheet (`components/feedback-sheet.tsx`) already accepts the exact format that `graded_questions` provides!

```typescript
// graded_questions table → FeedbackSheet component
const questions = await getGradedQuestions(studentAssessmentId)

<FeedbackSheet questions={questions} ... />
```

---

## Performance Optimizations

### Denormalized Fields
For faster feedback sheet generation, we denormalize:
- `question_number` in `graded_questions`
- `learning_objective` in `graded_questions`
- `max_marks` in `graded_questions`

This avoids expensive JOINs when generating feedback for 100+ students.

### Indexes
Optimized indexes on:
- `student_id` for fast student lookups
- `assessment_id` for class overview
- `learning_objective` for analytics
- `due_date` for upcoming assignments

---

## Next Steps

### Immediate Integration Tasks

1. **Update Exam Builder** to save to database:
   - Add "Save Assessment" button
   - Call `createAssessment()` and `addQuestionsToAssessment()`

2. **Create Grading Interface:**
   - Teacher views submitted assessments
   - Grades each question
   - Calls `submitGradedQuestions()`

3. **Student Assessment View:**
   - Show assigned assessments
   - Allow submission
   - Display feedback when graded

4. **Feedback Sheet Integration:**
   - Add "Generate Feedback" button to graded assessments
   - Fetch data with `getGradedQuestions()`
   - Render `<FeedbackSheet />` component

### Future Enhancements

- [ ] Bulk grading interface
- [ ] Auto-grading for multiple choice
- [ ] PDF export for feedback sheets
- [ ] Email feedback to students/parents
- [ ] Analytics dashboard (class performance by learning objective)
- [ ] Question bank system
- [ ] Rubric templates
- [ ] Peer review functionality

---

## Troubleshooting

### Issue: RLS Policy Errors

**Solution:** Ensure user is logged in and has correct role:

```sql
SELECT * FROM public.profiles WHERE id = auth.uid();
```

### Issue: Total Marks Not Updating

**Solution:** Check triggers exist:

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%assessment%';
```

### Issue: Cannot Insert Questions

**Solution:** Verify assessment exists and user owns it:

```sql
SELECT * FROM public.assessments 
WHERE id = 'your-assessment-id' 
AND teacher_id = auth.uid();
```

---

## Database Queries

### Get Class Performance by Learning Objective

```sql
SELECT 
  learning_objective,
  AVG(marks_awarded::float / max_marks * 100) as avg_percentage,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN marks_awarded::float / max_marks >= 0.7 THEN 1 ELSE 0 END) as strong_count
FROM graded_questions
WHERE student_assessment_id IN (
  SELECT id FROM student_assessments WHERE assessment_id = 'your-assessment-id'
)
GROUP BY learning_objective
ORDER BY avg_percentage DESC;
```

### Get Student's Weakest Topics

```sql
SELECT 
  learning_objective,
  AVG(marks_awarded::float / max_marks * 100) as avg_percentage
FROM graded_questions
WHERE student_assessment_id IN (
  SELECT id FROM student_assessments WHERE student_id = 'student-uuid'
)
GROUP BY learning_objective
HAVING AVG(marks_awarded::float / max_marks * 100) < 70
ORDER BY avg_percentage ASC;
```

---

## Support

For issues or questions:
1. Check this documentation
2. Verify RLS policies are enabled
3. Check Supabase logs for errors
4. Ensure TypeScript types are up to date

---

**Last Updated:** January 13, 2026  
**Schema Version:** 003  
**Status:** ✅ Ready for Production
