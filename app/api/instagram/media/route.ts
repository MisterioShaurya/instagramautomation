import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { decryptToken } from '@/lib/encryption'

/**
 * GET /api/instagram/media
 *
 * Fetches the logged-in user's Instagram reels from the Graph API.
 * Calls: GET /{ig-user-id}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,permalink,timestamp
 * Returns only items where media_product_type === 'REELS'.
 */
export async function GET(_request: NextRequest) {
  try {
    // 1. Validate session
    const session = await getServerSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Ensure DB connection
    await connectDB()

    // 3. Fetch user from DB to get the encrypted access token and instagramUserId
    const user = await User.findById(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.instagramConnected || !user.instagramAccessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please log in with Instagram first.' },
        { status: 400 }
      )
    }

    const igUserId = user.instagramUserId
    if (!igUserId) {
      return NextResponse.json(
        { error: 'Instagram user ID not found on profile.' },
        { status: 400 }
      )
    }

    // 3. Decrypt the access token
    const decryptedToken = decryptToken(user.instagramAccessToken)
    if (!decryptedToken) {
      return NextResponse.json(
        { error: 'Failed to decrypt Instagram access token.' },
        { status: 500 }
      )
    }

    // 4. Call the Instagram Graph API media endpoint
    const url = new URL(`https://graph.instagram.com/v21.0/${igUserId}/media`)
    url.searchParams.set('fields', 'id,caption,media_type,media_product_type,thumbnail_url,permalink,timestamp')
    url.searchParams.set('access_token', decryptedToken)

    console.log('[instagram-media] Fetching media from Instagram Graph API...')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Instagram API error'
      const errorCode = data.error?.code || response.status
      console.error('[instagram-media] API error:', errorMessage)

      // Handle expired / invalid token
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Instagram token expired or invalid. Please reconnect your account.', code: errorCode },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: errorMessage, code: errorCode },
        { status: response.status }
      )
    }

    // 5. Filter to REELS only and return
    const mediaItems: any[] = data.data || []
    const reels = mediaItems.filter(
      (item: any) => item.media_product_type === 'REELS'
    )

    console.log(`[instagram-media] Fetched ${mediaItems.length} media items, ${reels.length} are reels`)

    return NextResponse.json({
      reels,
      total: reels.length,
    })
  } catch (err) {
    console.error('[instagram-media] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}