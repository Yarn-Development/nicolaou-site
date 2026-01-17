/**
 * Debug script to test getStudentDashboardData() function
 * Run with: npx tsx scripts/debug-student-dashboard.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugStudentDashboard() {
  console.log("=".repeat(60))
  console.log("DEBUG: Student Dashboard Data")
  console.log("=".repeat(60))

  // 1. Find a student user
  console.log("\n1. Finding student users...")
  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "student")
    .limit(5)

  if (studentsError) {
    console.error("Error fetching students:", studentsError)
    return
  }

  console.log(`Found ${students?.length || 0} students:`)
  students?.forEach((s) => console.log(`  - ${s.email} (${s.full_name || "No name"})`))

  if (!students || students.length === 0) {
    console.log("No students found!")
    return
  }

  const student = students[0]
  console.log(`\nUsing student: ${student.email}`)

  // 2. Check enrollments
  console.log("\n2. Checking enrollments...")
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(`
      class_id,
      classes!inner(
        id,
        name,
        subject
      )
    `)
    .eq("student_id", student.id)

  if (enrollError) {
    console.error("Error fetching enrollments:", enrollError)
  } else {
    console.log(`Found ${enrollments?.length || 0} enrollments:`)
    enrollments?.forEach((e: any) => {
      console.log(`  - Class: ${e.classes.name} (${e.classes.subject})`)
    })
  }

  const classIds = enrollments?.map((e) => e.class_id) || []

  if (classIds.length === 0) {
    console.log("No enrolled classes - cannot continue")
    return
  }

  // 3. Check assignments in those classes
  console.log("\n3. Checking published assignments...")
  const { data: assignments, error: assignError } = await supabase
    .from("assignments")
    .select("id, title, class_id, status, content")
    .in("class_id", classIds)
    .eq("status", "published")

  if (assignError) {
    console.error("Error fetching assignments:", assignError)
  } else {
    console.log(`Found ${assignments?.length || 0} published assignments:`)
    assignments?.forEach((a: any) => {
      const questionIds = a.content?.question_ids || []
      console.log(`  - ${a.title} (${questionIds.length} questions)`)
    })
  }

  if (!assignments || assignments.length === 0) {
    console.log("No published assignments - cannot continue")
    return
  }

  // 4. Check submissions for this student
  console.log("\n4. Checking submissions...")
  const assignmentIds = assignments.map((a) => a.id)
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("id, assignment_id, student_id, score, status, grading_data, feedback_released, submitted_at, graded_at")
    .eq("student_id", student.id)
    .in("assignment_id", assignmentIds)

  if (subError) {
    console.error("Error fetching submissions:", subError)
  } else {
    console.log(`Found ${submissions?.length || 0} submissions:`)
    submissions?.forEach((s: any) => {
      const assignment = assignments.find((a) => a.id === s.assignment_id)
      console.log(`  - Assignment: ${assignment?.title}`)
      console.log(`    Status: ${s.status}`)
      console.log(`    Score: ${s.score}`)
      console.log(`    Grading Data: ${JSON.stringify(s.grading_data)}`)
      console.log(`    Feedback Released: ${s.feedback_released}`)
    })
  }

  // 5. Check questions and their topics
  console.log("\n5. Checking questions and topics...")
  for (const assignment of assignments) {
    const questionIds = (assignment.content as any)?.question_ids || []
    if (questionIds.length === 0) continue

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, marks, topic, sub_topic, difficulty")
      .in("id", questionIds)

    if (qError) {
      console.error(`Error fetching questions for ${assignment.title}:`, qError)
    } else {
      console.log(`\n  Assignment: ${assignment.title}`)
      console.log(`  Questions (${questions?.length || 0}):`)
      questions?.forEach((q: any) => {
        console.log(`    - ID: ${q.id.slice(0, 8)}...`)
        console.log(`      Marks: ${q.marks}`)
        console.log(`      Topic: ${q.topic || "(empty)"}`)
        console.log(`      Sub-topic: ${q.sub_topic || "(empty)"}`)
      })

      // Calculate what topic mastery would look like
      const submission = submissions?.find((s) => s.assignment_id === assignment.id)
      if (submission?.status === "graded" && questions) {
        console.log(`\n  Topic Mastery Calculation:`)
        const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>
        
        for (const q of questions) {
          const key = q.sub_topic || q.topic || "General"
          const earned = gradingData[q.id]?.score || 0
          const total = q.marks || 1
          console.log(`    - ${key}: earned ${earned}/${total}`)
        }
      }
    }
  }

  // 6. Calculate overall stats
  console.log("\n6. Calculating overall stats...")
  if (submissions && submissions.length > 0) {
    const gradedSubmissions = submissions.filter((s) => s.status === "graded")
    console.log(`  Graded submissions: ${gradedSubmissions.length}`)

    let totalPercentage = 0
    let count = 0

    for (const sub of gradedSubmissions) {
      const assignment = assignments.find((a) => a.id === sub.assignment_id)
      const questionIds = (assignment?.content as any)?.question_ids || []
      
      if (questionIds.length > 0) {
        const { data: questions } = await supabase
          .from("questions")
          .select("marks")
          .in("id", questionIds)

        const maxMarks = questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 0
        
        if (sub.score !== null && sub.score !== undefined && maxMarks > 0) {
          const percentage = Math.round((sub.score / maxMarks) * 100)
          console.log(`  - ${assignment?.title}: ${sub.score}/${maxMarks} = ${percentage}%`)
          totalPercentage += percentage
          count++
        } else {
          console.log(`  - ${assignment?.title}: score=${sub.score}, maxMarks=${maxMarks} (skipped)`)
        }
      }
    }

    if (count > 0) {
      const averageScore = Math.round(totalPercentage / count)
      console.log(`\n  AVERAGE SCORE: ${averageScore}%`)
    } else {
      console.log(`\n  AVERAGE SCORE: 0% (no valid graded submissions)`)
    }
  } else {
    console.log("  No submissions found")
  }

  console.log("\n" + "=".repeat(60))
  console.log("DEBUG COMPLETE")
  console.log("=".repeat(60))
}

debugStudentDashboard()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
