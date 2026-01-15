import { getTeacherAssignments, type AssignmentWithClass } from "@/app/actions/assignments"
import { AssessmentsPageClient } from "./assessments-page-client"

// Static video library - these are local educational video assets
const videoLibrary = [
  {
    id: "1",
    title: "Introduction to Quadratic Equations",
    topic: "Algebra",
    tier: "Higher",
    duration: "12:45",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/quadratic-equations.mp4",
    description: "Learn the fundamentals of quadratic equations, including standard form and basic solving techniques.",
    assessmentId: "assessment-1",
    views: 1247,
    difficulty: "Intermediate"
  },
  {
    id: "2",
    title: "Pythagoras Theorem Applications",
    topic: "Geometry", 
    tier: "Foundation",
    duration: "15:30",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/pythagoras-theorem.mp4",
    description: "Explore real-world applications of Pythagoras theorem with step-by-step examples.",
    assessmentId: "assessment-2",
    views: 892,
    difficulty: "Beginner"
  },
  {
    id: "3",
    title: "Statistical Measures and Averages",
    topic: "Statistics",
    tier: "Higher",
    duration: "18:20",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/statistical-measures.mp4",
    description: "Master mean, median, mode, and range calculations with practical examples.",
    assessmentId: "assessment-3",
    views: 656,
    difficulty: "Advanced"
  },
  {
    id: "4",
    title: "Fractions and Decimals",
    topic: "Number",
    tier: "Foundation",
    duration: "10:15",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/fractions-decimals.mp4",
    description: "Convert between fractions and decimals with confidence using proven methods.",
    assessmentId: "assessment-4",
    views: 1456,
    difficulty: "Beginner"
  },
  {
    id: "5",
    title: "Solving Simultaneous Equations",
    topic: "Algebra",
    tier: "Higher",
    duration: "14:10",
    thumbnail: "/api/placeholder/400/225",
    videoPath: "/assets/videos/SimEq1.mp4",
    description: "Learn how to solve simultaneous equations using substitution and elimination methods.",
    assessmentId: "assessment-5",
    views: 1032,
    difficulty: "Intermediate"
  }
]

// Demo assessments for fallback
const demoAssessments = [
  {
    id: "assessment-1",
    title: "Quadratic Equations Practice",
    questions: [
      {
        id: "q1",
        question: "Solve the equation x² + 5x + 6 = 0",
        type: "multiple-choice" as const,
        options: ["x = -2, x = -3", "x = 2, x = 3", "x = -1, x = -6", "x = 1, x = 6"],
        correct: 0,
        explanation: "Factor the quadratic: (x + 2)(x + 3) = 0, so x = -2 or x = -3"
      },
      {
        id: "q2", 
        question: "What is the discriminant of x² - 4x + 4 = 0?",
        type: "input" as const,
        correct: "0",
        explanation: "Discriminant = b² - 4ac = (-4)² - 4(1)(4) = 16 - 16 = 0"
      },
      {
        id: "q3",
        question: "Complete the square: x² + 6x + ?",
        type: "input" as const,
        correct: "9",
        explanation: "To complete the square, take half of the coefficient of x and square it: (6/2)² = 9"
      }
    ],
    timeLimit: 30,
    difficulty: "Intermediate"
  },
  {
    id: "assessment-2",
    title: "Pythagoras Theorem Quiz",
    questions: [
      {
        id: "q1",
        question: "In a right triangle with legs of 3cm and 4cm, what is the hypotenuse?",
        type: "multiple-choice" as const,
        options: ["5cm", "6cm", "7cm", "8cm"],
        correct: 0,
        explanation: "Using a² + b² = c²: 3² + 4² = 9 + 16 = 25, so c = √25 = 5cm"
      },
      {
        id: "q2",
        question: "Calculate the missing side: a = 5, c = 13, b = ?",
        type: "input" as const,
        correct: "12",
        explanation: "Using a² + b² = c²: 5² + b² = 13², so b² = 169 - 25 = 144, b = 12"
      }
    ],
    timeLimit: 20,
    difficulty: "Beginner"
  }
]

export interface VideoItem {
  id: string
  title: string
  topic: string
  tier: string
  duration: string
  thumbnail: string
  videoPath: string
  description: string
  assessmentId: string
  views: number
  difficulty: string
}

export interface AssessmentQuestion {
  id: string
  question: string
  type: "multiple-choice" | "input"
  options?: string[]
  correct: number | string
  explanation: string
}

export interface Assessment {
  id: string
  title: string
  questions: AssessmentQuestion[]
  timeLimit: number
  difficulty: string
  className?: string
  dueDate?: string
  status?: string
}

export interface AssessmentsPageData {
  videoLibrary: VideoItem[]
  assessments: Assessment[]
  teacherAssignments: AssignmentWithClass[]
}

export default async function AssessmentsPage() {
  // Fetch real assignments from database
  const assignmentsResult = await getTeacherAssignments()
  
  const hasRealAssignments = assignmentsResult.success && 
    assignmentsResult.data && 
    assignmentsResult.data.length > 0
  
  // Transform real assignments to our assessment format
  let assessments: Assessment[] = demoAssessments
  
  if (hasRealAssignments) {
    const realAssessments: Assessment[] = assignmentsResult.data!.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      questions: [], // Real questions would come from assignment content
      timeLimit: 30,
      difficulty: "Intermediate",
      className: assignment.class_name,
      dueDate: assignment.due_date ?? undefined,
      status: assignment.status
    }))
    
    // Merge real assessments with demo ones for videos
    assessments = [...demoAssessments, ...realAssessments]
  }
  
  const pageData: AssessmentsPageData = {
    videoLibrary,
    assessments,
    teacherAssignments: hasRealAssignments ? assignmentsResult.data! : []
  }
  
  return <AssessmentsPageClient data={pageData} isDemo={!hasRealAssignments} />
}
