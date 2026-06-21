'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Loader2, Trash2, ToggleLeft, Hash, MessageSquare, Film } from 'lucide-react'

interface AutomationRule {
  _id: string
  userId: string
  instagramUserId: string
  mediaId: string
  mediaThumbnail: string
  keyword: string
  matchType: 'exact' | 'contains'
  dmMessage: string
  active: boolean
  createdAt: string
}

export default function AutomationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard/automations')
    }
  }, [status, router])

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/automation-rules')
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Failed to fetch automation rules:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRules()
    }
  }, [status, fetchRules])

  const handleToggle = async (rule: AutomationRule) => {
    setTogglingId(rule._id)
    try {
      const res = await fetch(`/api/automation-rules/${rule._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      })
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r._id === rule._id ? { ...r, active: !r.active } : r))
        )
      }
    } catch {
      console.error('Failed to toggle rule')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (rule: AutomationRule) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    setDeletingId(rule._id)
    try {
      const res = await fetch(`/api/automation-rules/${rule._id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r._id !== rule._id))
      }
    } catch {
      console.error('Failed to delete rule')
    } finally {
      setDeletingId(null)
    }
  }

  // Group rules by mediaId for display
  const groupedByMedia = rules.reduce<Record<string, AutomationRule[]>>((acc, rule) => {
    if (!acc[rule.mediaId]) {
      acc[rule.mediaId] = []
    }
    acc[rule.mediaId].push(rule)
    return acc
  }, {})

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Automations
              </h1>
              <p className="mt-2 text-muted-foreground">
                Manage your keyword-based DM automation rules across all reels
              </p>
            </div>
            <Link
              href="/dashboard/reels"
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90"
            >
              <Film className="h-5 w-5" />
              Go to Reels
            </Link>
          </div>

          {/* Rules List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Hash className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                No automation rules yet
              </h3>
              <p className="mt-2 text-muted-foreground">
                Go to a reel and create rules that will automatically DM users when they comment with matching keywords.
              </p>
              <Link
                href="/dashboard/reels"
                className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90"
              >
                Browse Reels
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* All rules flat list */}
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule._id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Media badge */}
                          <Link
                            href={`/dashboard/reels/${rule.mediaId}/automate`}
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Film className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">
                              {rule.mediaId.slice(0, 12)}...
                            </span>
                          </Link>
                          {/* Match type badge */}
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            {rule.matchType === 'exact' ? 'Exact' : 'Contains'}
                          </span>
                          {/* Keyword */}
                          <span className="font-semibold text-foreground">
                            {rule.keyword}
                          </span>
                          {/* Active badge */}
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              rule.active
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rule.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {/* DM message */}
                        <div className="mt-2 flex items-start gap-2">
                          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {rule.dmMessage}
                          </p>
                        </div>
                        {/* Created date */}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {new Date(rule.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex gap-1">
                        <button
                          onClick={() => handleToggle(rule)}
                          disabled={togglingId === rule._id}
                          className={`rounded-lg p-2 transition-all hover:bg-muted ${
                            rule.active ? 'text-accent' : 'text-muted-foreground'
                          }`}
                          title={rule.active ? 'Deactivate' : 'Activate'}
                        >
                          {togglingId === rule._id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          disabled={deletingId === rule._id}
                          className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-red-400 disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === rule._id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary footer */}
              <div className="text-center text-sm text-muted-foreground">
                {rules.length} rule{rules.length !== 1 ? 's' : ''} across{' '}
                {Object.keys(groupedByMedia).length} reel{Object.keys(groupedByMedia).length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}