'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ArrowLeft, Loader2, Film, Plus, Trash2, ToggleLeft, MessageSquare, Hash, MessageCircle, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface ReelDetail {
  id: string
  caption?: string
  media_type: string
  media_product_type: string
  thumbnail_url?: string
  permalink?: string
  timestamp: string
}

interface AutomationRule {
  _id: string
  userId: string
  instagramUserId: string
  mediaId: string
  mediaThumbnail: string
  keyword: string
  matchType: 'exact' | 'contains'
  dmMessage: string
  commentReplyMessage?: string
  active: boolean
  createdAt: string
}

interface Comment {
  id: string
  text: string
  timestamp: string
  username: string
  commenterId: string
  replied: boolean
}

export default function AutomateReelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const mediaId = params.mediaId as string

  const [reel, setReel] = useState<ReelDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [keyword, setKeyword] = useState('')
  const [matchType, setMatchType] = useState<'exact' | 'contains'>('contains')
  const [dmMessage, setDmMessage] = useState('')
  const [commentReplyMessage, setCommentReplyMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Rules list state
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [totalComments, setTotalComments] = useState(0)
  const [repliedCount, setRepliedCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard/reels')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchReel() {
      try {
        const res = await fetch('/api/instagram/media')
        const data = await res.json()
        if (res.ok) {
          const found = (data.reels || []).find((r: ReelDetail) => r.id === mediaId)
          setReel(found || null)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') {
      fetchReel()
    }
  }, [mediaId, status])

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/automation-rules?mediaId=${encodeURIComponent(mediaId)}`)
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch {
      // Silently fail
    } finally {
      setRulesLoading(false)
    }
  }, [mediaId])

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/instagram/comments?mediaId=${encodeURIComponent(mediaId)}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
        setTotalComments(data.total || 0)
        setRepliedCount(data.repliedCount || 0)
      }
    } catch {
      // Silently fail
    } finally {
      setCommentsLoading(false)
    }
  }, [mediaId])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRules()
      fetchComments()
    }
  }, [status, fetchRules, fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!keyword.trim()) {
      setError('Keyword is required')
      return
    }
    if (!dmMessage.trim() && !commentReplyMessage.trim()) {
      setError('At least a DM message or comment reply message is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          mediaThumbnail: reel?.thumbnail_url || '',
          keyword: keyword.trim(),
          matchType,
          dmMessage: dmMessage.trim(),
          commentReplyMessage: commentReplyMessage.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create rule')
      }

      setSuccess('Rule created successfully!')
      setKeyword('')
      setMatchType('contains')
      setDmMessage('')
      setCommentReplyMessage('')
      fetchRules()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setSaving(false)
    }
  }

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
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-6">
            {/* Back link */}
            <Link
              href="/dashboard/reels"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to reels
            </Link>

            <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
              {/* Reel preview + Comments */}
              <div className="space-y-6">
                {/* Reel preview */}
                <div>
                  {loading ? (
                    <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                  ) : reel ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="aspect-[9/16] w-full overflow-hidden bg-muted">
                        {reel.thumbnail_url ? (
                          <img
                            src={reel.thumbnail_url}
                            alt={reel.caption || 'Reel thumbnail'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film className="h-16 w-16 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <h2 className="font-semibold">Reel Details</h2>
                        {reel.caption && (
                          <p className="text-sm text-muted-foreground">{reel.caption}</p>
                        )}
                        {!reel.caption && (
                          <p className="text-sm text-muted-foreground italic">No caption</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Posted{' '}
                          {new Date(reel.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {reel.permalink && (
                          <a
                            href={reel.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            View on Instagram ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8">
                      <Film className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">Reel not found</p>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Comments
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {repliedCount}/{totalComments} replied
                      </span>
                      <button
                        onClick={fetchComments}
                        disabled={commentsLoading}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${commentsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No comments yet on this reel. Comments will appear here once people comment.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`rounded-lg border p-3 ${
                            comment.replied
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-border bg-background'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {comment.username}
                            </span>
                            {comment.replied ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Replied
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{comment.text}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Automation Setup */}
              <div className="space-y-6">
                {/* Create Rule Form */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Create Automation Rule
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Keyword */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        <Hash className="mr-1 inline-block h-4 w-4" />
                        Keyword
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          placeholder="e.g. pricing, hello, discount..."
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <select
                          value={matchType}
                          onChange={(e) => setMatchType(e.target.value as 'exact' | 'contains')}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="contains">Contains</option>
                          <option value="exact">Exact</option>
                        </select>
                      </div>
                    </div>

                    {/* Comment Reply Message (public) */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        <MessageCircle className="mr-1 inline-block h-4 w-4" />
                        Public Comment Reply <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={commentReplyMessage}
                        onChange={(e) => setCommentReplyMessage(e.target.value)}
                        placeholder="Public reply to the comment on Instagram..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        This will be posted as a public reply to the comment on Instagram.
                      </p>
                    </div>

                    {/* DM Message (private) */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        <MessageSquare className="mr-1 inline-block h-4 w-4" />
                        DM Message <span className="text-muted-foreground font-normal">(sent privately)</span>
                      </label>
                      <textarea
                        value={dmMessage}
                        onChange={(e) => setDmMessage(e.target.value)}
                        placeholder="Private DM to send to the commenter..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        This will be sent as a private DM to the commenter.
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Save Rule
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Existing Rules */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Rules for this Reel
                  </h3>

                  {rulesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No rules yet. Create one above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <div
                          key={rule._id}
                          className="flex items-start justify-between rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                                {rule.matchType === 'exact' ? 'Exact' : 'Contains'}
                              </span>
                              <span className="font-medium text-foreground truncate">
                                {rule.keyword}
                              </span>
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
                            {rule.dmMessage && (
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                <span className="text-xs font-medium text-blue-400">DM:</span> {rule.dmMessage}
                              </p>
                            )}
                            {rule.commentReplyMessage && (
                              <p className="truncate text-sm text-muted-foreground">
                                <span className="text-xs font-medium text-green-400">Reply:</span> {rule.commentReplyMessage}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              Created {new Date(rule.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-3 flex gap-1 shrink-0">
                            <button
                              onClick={() => handleToggle(rule)}
                              disabled={togglingId === rule._id}
                              className={`rounded-lg p-2 transition-all hover:bg-muted ${
                                rule.active ? 'text-accent' : 'text-muted-foreground'
                              }`}
                              title={rule.active ? 'Deactivate' : 'Activate'}
                            >
                              {togglingId === rule._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(rule)}
                              disabled={deletingId === rule._id}
                              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-red-400 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === rule._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}