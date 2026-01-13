import { redirect } from "next/navigation"

export default function SignupPage() {
  // Redirect to login page since we only use Google OAuth
  // Sign up and sign in are the same flow with Google
  redirect('/login')
}
