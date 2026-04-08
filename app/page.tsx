import Hero from '@/components/Hero'
import TrustBar from '@/components/TrustBar'
import ProblemSection from '@/components/ProblemSection'
import FeaturesSection from '@/components/FeaturesSection'
import PlanningDemoSection from '@/components/PlanningDemoSection'
import PricingSection from '@/components/PricingSection'
import FaqSection from '@/components/FaqSection'
import CtaSection from '@/components/CtaSection'

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <ProblemSection />
      <FeaturesSection />
      <PlanningDemoSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
