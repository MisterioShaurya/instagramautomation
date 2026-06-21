'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { StatsCards } from '@/components/dashboard/stats-cards'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {session.name || session.instagramUserId}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Here&apos;s an overview of your automation performance.
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Quick Actions */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">
              Quick Actions
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">
                  Create New Automation
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set up a new automation to respond to Instagram comments and
                  DMs
                </p>
                <button className="mt-4 rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90">
                  Get Started
                </button>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">
                  Connect Instagram
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Link your Instagram business account to start automating
                </p>
                <button className="mt-4 rounded-lg border border-border px-4 py-2 font-medium text-foreground transition-all hover:bg-muted">
                  Connect Account
                </button>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-12 rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground">Getting Started</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                • Create your first automation to handle common Instagram
                comments
              </li>
              <li>• Enable AI-powered responses to match your brand tone</li>
              <li>• Monitor performance in real-time with analytics</li>
              <li>• Qualify leads automatically with intelligent questions</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
