import { HeroSection } from "@/components/hero-section"
import { FeatureSection } from "@/components/feature-section"
import { PricingSection } from "@/components/pricing-section"
import { CTASection } from "@/components/cta-section"
import { MarketingHeader } from "@/components/marketing-header"
import { MarketingFooter } from "@/components/marketing-footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <HeroSection />
        <FeatureSection />
        

        {/* <StatsSection /> */}
        {/* <TestimonialsSection /> */}
        <PricingSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
