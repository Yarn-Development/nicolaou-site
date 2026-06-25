import { OnboardingFlow } from "@/components/onboarding-flow"
import { getOnboardingState } from "@/app/actions/onboarding"

export default async function OnboardingPage() {
  const state = await getOnboardingState()

  return (
    <OnboardingFlow
      initialRole={state.initialRole}
      roleSource={state.roleSource}
      prefillEmail={state.email}
      prefillName={state.fullName}
    />
  )
}
