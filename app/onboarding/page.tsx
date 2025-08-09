import { OnboardingFlow } from "@/components/onboarding-flow"
import { AuthLayout } from "@/components/auth-layout"

export default function OnboardingPage() {
  return (
    <AuthLayout>
      <OnboardingFlow />
    </AuthLayout>
  )
}
