import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateStudentFeedback } from "@/app/actions/feedback"
import { generateFeedbackBuffer } from "@/lib/feedback-pdf"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const result = await generateStudentFeedback(submissionId)

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error || "Failed to generate feedback" },
      { status: 400 }
    )
  }

  try {
    const buffer = await generateFeedbackBuffer(result.data)

    const filename = `feedback-${result.data.studentName.replace(/\s+/g, "-").toLowerCase()}-${result.data.assignmentTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
