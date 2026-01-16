import { getStudentAssignmentFeedback } from "@/app/actions/feedback"
import { LatexPreview } from "@/components/latex-preview"

interface Props {
  params: Promise<{
    studentId: string
    assignmentId: string
  }>
}

export default async function RevisionPrintPage({ params }: Props) {
  const { studentId, assignmentId } = await params
  const result = await getStudentAssignmentFeedback(assignmentId, studentId)

  if (!result.success || !result.data) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p>{result.error || "Could not load feedback"}</p>
      </div>
    )
  }

  const feedback = result.data
  const ragColor = feedback.overallPercentage >= 70 
    ? "#22c55e" 
    : feedback.overallPercentage >= 40 
      ? "#eab308" 
      : "#ef4444"

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-4">
      {/* Header */}
      <header className="border-b-4 border-black pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1">
              REVISION WORKSHEET
            </h1>
            <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Targeted Practice for {feedback.studentName}
            </p>
          </div>
          <div 
            className="text-right px-6 py-4 border-4 border-black"
            style={{ backgroundColor: `${ragColor}20` }}
          >
            <p className="text-4xl font-black" style={{ color: ragColor }}>
              {feedback.overallPercentage}%
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Original Score
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <span className="font-bold text-gray-500 uppercase text-xs">Assignment:</span>
            <span className="ml-2 font-bold">{feedback.assignmentTitle}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase text-xs">Date:</span>
            <span className="ml-2 font-bold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Topics Needing Work */}
      {feedback.weakTopics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
            Topics to Focus On
          </h2>
          
          <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
            {feedback.weakTopics.map((topic) => (
              <div 
                key={topic.topic}
                className="border-2 border-black p-4 bg-red-50"
              >
                <h3 className="font-black uppercase text-sm mb-2">{topic.topic}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-red-600">
                    {topic.percentage}%
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    ({topic.earnedMarks}/{topic.totalMarks} marks)
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {topic.subTopic && `Sub-topic: ${topic.subTopic}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Revision Questions */}
      {feedback.revisionQuestions.length > 0 ? (
        <section>
          <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-6">
            Practice Questions
          </h2>
          
          <div className="space-y-8">
            {feedback.revisionQuestions.map((question, index) => (
              <div 
                key={question.id}
                className="border-2 border-black p-6 break-inside-avoid"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-gray-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest px-2 py-1 bg-black text-white">
                        {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 border border-gray-400 text-gray-600">
                      {question.topic}
                    </span>
                  </div>
                </div>

                {/* Question Content */}
                <div className="mb-6">
                  {question.imageUrl ? (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={question.imageUrl} 
                        alt={`Question ${index + 1}`}
                        className="max-w-full max-h-64 border border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="text-base leading-relaxed">
                      <LatexPreview latex={question.questionLatex} />
                    </div>
                  )}
                </div>

                {/* Answer Space */}
                <div className="border-t-2 border-dashed border-gray-300 pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Your Answer:
                  </p>
                  <div className="min-h-[100px] border border-gray-200 bg-gray-50 rounded">
                    {/* Lined paper effect */}
                    <div className="h-full" style={{
                      backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, #e5e5e5 23px, #e5e5e5 24px)",
                      minHeight: "100px"
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="text-center py-12 border-2 border-gray-200 bg-gray-50">
          <p className="text-lg font-bold text-gray-500 uppercase tracking-wider">
            Great work! No additional revision questions needed.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            All topics scored above 40%
          </p>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t-2 border-gray-200 text-center text-xs text-gray-400">
        <p className="font-bold uppercase tracking-widest">
          Generated {new Date().toLocaleDateString()} • Targeted Revision System
        </p>
      </footer>
    </div>
  )
}
