'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Zap, Activity, Target } from 'lucide-react'

interface StatsData {
  totalAutomations: number
  activeAutomations: number
  totalTriggers: number
  totalResponses: number
  engagementRate: number
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    )
  }

  if (!stats) {
    return <div>Failed to load statistics</div>
  }

  const cards = [
    {
      title: 'Active Automations',
      value: stats.activeAutomations,
      icon: Zap,
      color: 'text-accent',
    },
    {
      title: 'Total Triggers',
      value: stats.totalTriggers,
      icon: Activity,
      color: 'text-blue-400',
    },
    {
      title: 'Responses Sent',
      value: stats.totalResponses,
      icon: Target,
      color: 'text-green-400',
    },
    {
      title: 'Engagement Rate',
      value: `${stats.engagementRate}%`,
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
