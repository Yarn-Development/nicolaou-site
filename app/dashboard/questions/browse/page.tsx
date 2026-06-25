import { getAuthUser } from "@/lib/auth"
import { getCurrentProfile } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import QuestionBrowserClient from "./question-browser-client"

export default async function QuestionBrowserPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect('/sign-in')
  }

  const profile = await getCurrentProfile()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    redirect('/student-dashboard')
  }

  return <QuestionBrowserClient />
}
