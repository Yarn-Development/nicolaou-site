import { OnboardingFlow } from "@/components/onboarding-flow"
import { AuthLayout } from "@/components/auth-layout"
import { getCurrentProfile } from "@/lib/auth/helpers"

export default async function OnboardingPage() {
  const profile = await getCurrentProfile()

  return (
    <AuthLayout>
      <OnboardingFlow
        initialRole={profile?.role ?? null}
        roleSource={profile?.role_source ?? 'pending'}
      />
    </AuthLayout>
  )
}
