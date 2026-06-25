import { getParentPortalData } from "@/app/actions/parent-portal"
import { ParentPortalClient } from "./parent-portal-client"

interface Props {
  params: Promise<{ token: string }>
}

export default async function ParentPortalPage({ params }: Props) {
  const { token } = await params

  const result = await getParentPortalData(token)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-swiss-concrete flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 bg-white border-2 border-swiss-ink text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-swiss-ink mb-3">
            Link Expired
          </h1>
          <p className="text-swiss-lead font-medium">
            This parent access link has expired or is invalid. Please ask the teacher
            to resend the feedback email to receive a new link.
          </p>
        </div>
      </div>
    )
  }

  return <ParentPortalClient token={token} data={result.data} />
}
