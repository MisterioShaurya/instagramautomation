'use client'

import Link from 'next/link'

export function CTA() {
  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
          Ready to Scale Your Instagram Revenue?
        </h2>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto text-balance">
          Join creators and businesses using AI to automate their DM sales funnel. Connect your Instagram account and get started in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors text-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 border border-border hover:bg-secondary transition-colors font-semibold rounded-lg text-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}