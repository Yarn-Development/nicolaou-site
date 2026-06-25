import { redirect } from "next/navigation"

/**
 * Clerk sign-in page.
 *
 * When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set, renders the Clerk
 * hosted sign-in component. Otherwise redirects to the existing
 * legacy /login page.
 */
export default function SignInPage() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!hasClerk) {
    redirect("/login")
  }

  return <ClerkSignIn />
}

async function ClerkSignIn() {
  const { SignIn } = await import("@clerk/nextjs")
  return (
    <div className="min-h-screen flex items-center justify-center bg-swiss-paper">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: "bg-swiss-signal hover:bg-swiss-signal/90 text-white",
            card: "border-4 border-swiss-ink shadow-none rounded-none",
          },
        }}
      />
    </div>
  )
}
