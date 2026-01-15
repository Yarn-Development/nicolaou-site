import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import QuestionBrowserClient from "./question-browser-client"

export default async function QuestionBrowserPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is teacher or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    redirect('/student-dashboard')
  }

  return <QuestionBrowserClient />
}
