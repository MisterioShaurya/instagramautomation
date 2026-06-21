'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Film, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface Reel {
  id: string
  caption?: string
  media_type: string
  media_product_type: string
  thumbnail_url?: string
  permalink?: string
  timestamp: string
}

export default function ReelsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard/reels')
    }
  }, [status, router])

  async function fetchReels() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/instagram/media')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch reels')
      }

      setReels(data.reels || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReels()
    }
  }, [status])

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
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Reels</h1>
                <p className="mt-1 text-muted-foreground">
                  Select a reel to configure DM automation for new comments.
                </p>
              </div>
              <button
                onClick={fetchReels}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="mt-4 text-muted-foreground">Loading your reels...</p>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="mt-4 text-lg font-medium">Failed to load reels</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={fetchReels}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && reels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Film className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No reels found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Post a reel on Instagram and it will appear here.
                </p>
              </div>
            )}

            {/* Thumbnail grid */}
            {!loading && !error && reels.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {reels.map((reel) => (
                  <Link
                    key={reel.id}
                    href={`/dashboard/reels/${reel.id}/automate`}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/5"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[9/16] w-full overflow-hidden bg-muted">
                      {reel.thumbnail_url ? (
                        <img
                          src={reel.thumbnail_url}
                          alt={reel.caption || 'Reel thumbnail'}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Film className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Overlay info */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                      {/* Caption preview */}
                      {reel.caption && (
                        <p className="mb-2 line-clamp-2 text-sm text-white/90">
                          {reel.caption}
                        </p>
                      )}
                      {!reel.caption && (
                        <p className="mb-2 text-sm text-white/50 italic">No caption</p>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-white/60">
                        {new Date(reel.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Hover action indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-lg">
                        Automate DM Replies
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}