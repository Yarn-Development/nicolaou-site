import { type NextRequest, NextResponse } from "next/server"
import { getParentFeedbackDetail } from "@/app/actions/parent-portal"
import { generateFeedbackBuffer } from "@/lib/feedback-pdf"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; submissionId: string }> }
) {
  const { token, submissionId } = await params

  const result = await getParentFeedbackDetail(token, submissionId)

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error || "Not found" },
      { status: result.error?.includes("expired") || result.error?.includes("Invalid") ? 403 : 400 }
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
    console.error("Parent PDF generation error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
