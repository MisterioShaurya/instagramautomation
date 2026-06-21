'use client'

import { useSession } from '@/lib/session'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TrendingUp, Activity, Target } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'unauthenticated') {
    router.push('/auth/login?callbackUrl=/dashboard/analytics')
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="mt-2 text-muted-foreground">
              Monitor your automation performance and insights
            </p>
          </div>

          {/* Time Period Selector */}
          <div className="mb-6 flex gap-2">
            {['7d', '30d', '90d', 'all'].map((period) => (
              <button
                key={period}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  period === '30d'
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {period === '7d'
                  ? '7 Days'
                  : period === '30d'
                    ? '30 Days'
                    : period === '90d'
                      ? '90 Days'
                      : 'All Time'}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Interactions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    2,847
                  </p>
                  <p className="mt-1 text-xs text-green-400">↑ 12% from last month</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Engagement Rate
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    68%
                  </p>
                  <p className="mt-1 text-xs text-green-400">↑ 5% from last month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Leads Generated
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    342
                  </p>
                  <p className="mt-1 text-xs text-green-400">↑ 23% from last month</p>
                </div>
                <Target className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">
                Interactions Over Time
              </h3>
              <div className="mt-6 h-64 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Chart visualization would be displayed here
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    (Integration with charting library like Recharts)
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">
                Top Performing Automations
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  {
                    name: 'Send Product Link',
                    interactions: 1243,
                    conversionRate: 42,
                  },
                  { name: 'Lead Qualifier', interactions: 856, conversionRate: 38 },
                  {
                    name: 'Welcome Message',
                    interactions: 748,
                    conversionRate: 35,
                  },
                ].map((auto) => (
                  <div
                    key={auto.name}
                    className="flex items-center justify-between rounded-lg bg-muted p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{auto.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {auto.interactions} interactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">
                        {auto.conversionRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        conversion
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
            <div className="mt-4 space-y-2">
              {[
                {
                  action: 'Automation triggered',
                  details: 'Send Product Link automation responded to 12 comments',
                  time: '2 minutes ago',
                },
                {
                  action: 'Lead qualified',
                  details: 'User qualified as hot lead - budget > $10k',
                  time: '15 minutes ago',
                },
                {
                  action: 'Configuration updated',
                  details: 'Lead Qualifier automation rules modified',
                  time: '1 hour ago',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between border-b border-border py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.details}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
