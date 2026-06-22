import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { encryptToken, decryptToken } from '@/lib/encryption'

// Init mongoose
import('@/models/User').catch(() => {})

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution

/**
 * GET /api/cron/refresh-tokens
 *
 * Scheduled function (call via Vercel Cron or external cron service).
 * Finds all Users whose tokenExpiresAt is within 5 days, and refreshes
 * their long-lived Instagram access token.
 *
 * Vercel Cron config: { "crons": [{ "path": "/api/cron/refresh-tokens", "schedule": "0 0 * * *" }] }
 *
 * For security, this endpoint should be protected with a CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[cron:refresh-tokens] Starting token refresh check...')

    // Ensure DB connection
    await connectDB()

    // Calculate the date 5 days from now
    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

    const now = new Date()

    // Find users whose token is expiring within 5 days and hasn't expired yet
    const users = await User.find({
      instagramAccessToken: { $ne: null },
      instagramAccessTokenEncrypted: true,
      tokenExpiresAt: {
        $gte: now, // not yet expired
        $lte: fiveDaysFromNow, // expiring within 5 days
      },
    })

    console.log(`[cron:refresh-tokens] Found ${users.length} users with tokens expiring within 5 days`)

    const results: Array<{
      userId: string
      instagramUserId: string
      status: 'refreshed' | 'failed'
      error?: string
    }> = []

    for (const user of users) {
      try {
        const decryptedToken = decryptToken(user.instagramAccessToken)
        if (!decryptedToken) {
          results.push({
            userId: user._id.toString(),
            instagramUserId: user.instagramUserId || 'unknown',
            status: 'failed',
            error: 'Failed to decrypt token',
          })
          continue
        }

        // Call Instagram's refresh_token endpoint
        const url = new URL('https://graph.instagram.com/refresh_access_token')
        url.searchParams.set('grant_type', 'ig_refresh_token')
        url.searchParams.set('access_token', decryptedToken)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error?.message || `HTTP ${response.status}: Failed to refresh token`
          )
        }

        // Instagram returns: { access_token, token_type, expires_in }
        const newToken: string = data.access_token
        const expiresIn: number = data.expires_in // typically 5184000 (60 days)

        // Encrypt and save the new token
        const encryptedNewToken = encryptToken(newToken)
        user.instagramAccessToken = encryptedNewToken
        user.instagramAccessTokenEncrypted = true
        user.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
        await user.save()

        results.push({
          userId: user._id.toString(),
          instagramUserId: user.instagramUserId || 'unknown',
          status: 'refreshed',
        })

        console.log(
          `[cron:refresh-tokens] Refreshed token for user ${user.instagramUserId}`
        )
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(
          `[cron:refresh-tokens] Failed to refresh token for user ${user.instagramUserId}:`,
          errorMessage
        )
        results.push({
          userId: user._id.toString(),
          instagramUserId: user.instagramUserId || 'unknown',
          status: 'failed',
          error: errorMessage,
        })
        // Continue processing other users
      }
    }

    const refreshedCount = results.filter((r) => r.status === 'refreshed').length
    const failedCount = results.filter((r) => r.status === 'failed').length

    console.log(
      `[cron:refresh-tokens] Complete: ${refreshedCount} refreshed, ${failedCount} failed`
    )

    return NextResponse.json({
      success: true,
      processed: results.length,
      refreshed: refreshedCount,
      failed: failedCount,
      results,
    })
  } catch (err) {
    console.error('[cron:refresh-tokens] Fatal error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}