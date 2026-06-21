'use client'

import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-32 overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
          <span className="text-sm font-medium text-accent">New AI Technology</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
          Transform Instagram Comments into Sales
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed text-balance">
          AI-powered automation that responds to comments and DMs with natural conversations. Qualify leads automatically. Never miss a sale again.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
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