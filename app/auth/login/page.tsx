'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/session'
import { MessageCircle } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
      router.push(callbackUrl)
    }
  }, [status, router, searchParams])

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    if (errorParam === 'instagram_denied') {
      setError('Instagram access was denied. Please try again.')
    } else if (errorParam === 'no_code') {
      setError('No authorization code received from Instagram.')
    } else if (errorParam === 'oauth_failed') {
      setError(messageParam || 'Failed to authenticate with Instagram. Please try again.')
    }
  }, [searchParams])

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

  if (status === 'authenticated') return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            DM Automation
          </h1>
          <p className="mt-2 text-muted-foreground">
            Connect your Instagram Business or Creator account to get started
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Connect Instagram Button */}
        <a
          href="/api/auth/instagram/start"
          className="flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 py-3 font-semibold text-white transition-all hover:opacity-90"
        >
          <MessageCircle className="h-6 w-6" />
          Connect Instagram Account
        </a>

        {/* Info */}
        <div className="mt-8 space-y-4 text-center text-sm text-muted-foreground">
          <p>
            You need an Instagram Business or Creator account to use this tool.
          </p>
          <p>
            By connecting, you authorize DM Automation to manage comments and
            messages on your behalf.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}