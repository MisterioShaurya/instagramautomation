import { Hero } from '@/components/hero'
import { HowItWorks } from '@/components/how-it-works'
import { Features } from '@/components/features'
import { Comparison } from '@/components/comparison'
import { CTA } from '@/components/cta'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <HowItWorks />
      <Features />
      <Comparison />
      <CTA />
    </main>
  )
}
