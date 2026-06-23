import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { decryptToken } from '@/lib/encryption'
import { debugToken, getPageAccessToken } from '@/lib/instagram-api'

/**
 * GET /api/debug/permissions
 *
 * Audits the current user's Instagram token:
 * 1. Token validity, scopes, expiry
 * 2. Checks required scopes
 * 3. Checks account type (must be BUSINESS or CREATOR)
 * 4. Checks if page access token is available
 *
 * Returns a JSON report showing what's working and what's missing.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(session.userId).lean()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const report: any = {
      userId: user._id.toString(),
      instagramUserId: user.instagramUserId,
      instagramConnected: user.instagramConnected,
      hasUserToken: !!user.instagramAccessToken,
      hasPageToken: !!user.pageAccessToken,
      hasPageId: !!user.instagramPageId,
      hasAccountId: !!user.instagramAccountId,
      tokenDebug: null,
      pageTokenDebug: null,
      requiredScopes: {
        instagram_manage_comments: false,
        instagram_manage_messages: false,
        instagram_basic: false,
        pages_read_engagement: false,
        pages_manage_metadata: false,
        pages_messaging: false,
      },
      accountType: null,
      pageAccessTokenAvailable: false,
      errors: [] as string[],
    }

    // 1. Debug the user access token
    if (user.instagramAccessToken) {
      try {
        const decrypted = decryptToken(user.instagramAccessToken)
        if (decrypted) {
          const tokenInfo = await debugToken(decrypted)
          report.tokenDebug = {
            isValid: tokenInfo.is_valid,
            expiresAt: tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000).toISOString() : null,
            type: tokenInfo.type,
            appId: tokenInfo.app_id,
            profileId: tokenInfo.profile_id,
          }

          // Check scopes
          const scopes: string[] = tokenInfo.scopes || tokenInfo.granular_scopes?.map((s: any) => s.scope) || []
          report.requiredScopes.instagram_manage_comments = scopes.includes('instagram_manage_comments')
          report.requiredScopes.instagram_manage_messages = scopes.includes('instagram_manage_messages')
          report.requiredScopes.instagram_basic = scopes.includes('instagram_basic')
          report.requiredScopes.pages_read_engagement = scopes.includes('pages_read_engagement')
          report.requiredScopes.pages_manage_metadata = scopes.includes('pages_manage_metadata')
          report.requiredScopes.pages_messaging = scopes.includes('pages_messaging')

          // Check account type
          try {
            const meUrl = `https://graph.facebook.com/v19.0/me?fields=account_type&access_token=${encodeURIComponent(decrypted)}`
            const meResp = await fetch(meUrl.toString())
            const meData = await meResp.json()
            if (meResp.ok) {
              report.accountType = meData.account_type || 'unknown'
            }
          } catch (e: any) {
            report.errors.push(`Account type check failed: ${e.message}`)
          }
        }
      } catch (e: any) {
        report.errors.push(`Token debug failed: ${e.message}`)
      }
    }

    // 2. Try to get page access token if we have user token but no page token
    if (!user.pageAccessToken && user.instagramAccessToken) {
      try {
        const pageInfo = await getPageAccessToken(user.instagramAccessToken)
        if (pageInfo) {
          report.pageAccessTokenAvailable = true
          report.pageInfo = {
            pageId: pageInfo.pageId,
            pageName: pageInfo.pageName,
          }
        } else {
          report.errors.push('Could not get page access token. Make sure you have a Facebook Page with Instagram Business Account connected.')
        }
      } catch (e: any) {
        report.errors.push(`Page token fetch failed: ${e.message}`)
      }
    }

    // 3. Debug page access token if available
    if (user.pageAccessToken) {
      try {
        const decrypted = decryptToken(user.pageAccessToken)
        if (decrypted) {
          const pageTokenInfo = await debugToken(decrypted)
          report.pageTokenDebug = {
            isValid: pageTokenInfo.is_valid,
            expiresAt: pageTokenInfo.expires_at ? new Date(pageTokenInfo.expires_at * 1000).toISOString() : null,
            type: pageTokenInfo.type,
          }
        }
      } catch (e: any) {
        report.errors.push(`Page token debug failed: ${e.message}`)
      }
    }

    // Summary
    const missingScopes = Object.entries(report.requiredScopes)
      .filter(([_, present]) => !present)
      .map(([scope]) => scope)

    report.summary = {
      canFetchReels: report.requiredScopes.instagram_basic,
      canFetchComments: report.requiredScopes.instagram_manage_comments && (!!user.pageAccessToken || report.pageAccessTokenAvailable),
      canReplyToComments: report.requiredScopes.instagram_manage_comments && (!!user.pageAccessToken || report.pageAccessTokenAvailable),
      canSendDMs: report.requiredScopes.instagram_manage_messages && (!!user.pageAccessToken || report.pageAccessTokenAvailable),
      missingScopes,
      needsReconnect: missingScopes.length > 0 || !user.pageAccessToken,
    }

    return NextResponse.json(report)
  } catch (err) {
    console.error('[debug/permissions] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}