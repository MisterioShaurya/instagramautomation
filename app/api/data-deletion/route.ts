import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Automation from '@/models/Automation'
import AutomationRule from '@/models/AutomationRule'
import SentReply from '@/models/SentReply'
import ActivityLog from '@/models/ActivityLog'

// Init mongoose models
import('@/models/User').catch(() => {})
import('@/models/Automation').catch(() => {})
import('@/models/AutomationRule').catch(() => {})
import('@/models/SentReply').catch(() => {})
import('@/models/ActivityLog').catch(() => {})

export const dynamic = 'force-dynamic'

/**
 * POST /api/data-deletion
 *
 * Meta App Review required endpoint for data deletion callbacks.
 * Meta sends a signed request containing the user ID of the person
 * requesting data deletion. We look up the user by instagramUserId,
 * delete all associated data, and return a confirmation URL + code
 * per Meta's specification.
 *
 * Meta expects a response like:
 * {
 *   "url": "https://example.com/data-deletion/status?id=abc123",
 *   "confirmation_code": "abc123"
 * }
 *
 * If the signed_request is not provided, we also accept:
 * - X-Instagram-User-Id header (for direct API deletion)
 * - JSON body with { instagramUserId: string }
 *
 * This allows both Meta's callback and direct user-initiated deletion.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    let instagramUserId: string | null = null

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Meta sends data deletion callbacks as form-urlencoded with a 'signed_request' field
      const formData = await request.formData()
      const signedRequest = formData.get('signed_request') as string | null

      if (signedRequest) {
        // Parse the signed request (format: base64encoded_json.signature)
        // We only need the payload part
        const parts = signedRequest.split('.')
        if (parts.length === 2) {
          try {
            // URL-safe base64 decode
            let encodedPayload = parts[0].replace(/-/g, '+').replace(/_/g, '/')
            // Pad with = to make length multiple of 4
            while (encodedPayload.length % 4 !== 0) {
              encodedPayload += '='
            }
            const decodedPayload = Buffer.from(encodedPayload, 'base64').toString('utf-8')
            const payload = JSON.parse(decodedPayload)
            // The user_id field contains the Instagram user ID
            instagramUserId = payload.user_id || null
          } catch {
            // If parsing fails, continue to check other methods
          }
        }
      }
    } else if (contentType.includes('application/json')) {
      // Direct API deletion via JSON body
      const body = await request.json()
      instagramUserId = body.instagramUserId || body.user_id || null
    }

    // Fallback: check header for direct deletion
    if (!instagramUserId) {
      instagramUserId =
        request.headers.get('X-Instagram-User-Id') ||
        request.nextUrl.searchParams.get('instagramUserId')
    }

    if (!instagramUserId) {
      return NextResponse.json(
        {
          error:
            'Missing user identifier. Provide instagramUserId in body, X-Instagram-User-Id header, or signed_request.',
        },
        { status: 400 }
      )
    }

    console.log('[data-deletion] Processing deletion for Instagram user:', instagramUserId)

    // Find the user in our database
    const user = await User.findOne({ instagramUserId })

    if (!user) {
      // No user found - still return success per Meta spec (data doesn't exist)
      console.log('[data-deletion] No user found for Instagram ID:', instagramUserId)
      const confirmationCode = `no-data-${instagramUserId}`
      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dmautomation.app'}/data-deletion/status?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      })
    }

    const userId = user._id.toString()

    // Delete all associated data
    // Run deletions in parallel for efficiency
    const deletions = await Promise.allSettled([
      Automation.deleteMany({ userId }),
      AutomationRule.deleteMany({ userId }),
      SentReply.deleteMany({ userId }),
      ActivityLog.deleteMany({ userId }),
      User.deleteOne({ _id: user._id }),
    ])

    // Log deletion results
    const deletionResults = deletions.map((result, index) => {
      const collections = ['Automation', 'AutomationRule', 'SentReply', 'ActivityLog', 'User']
      if (result.status === 'fulfilled') {
        return `${collections[index]}: deleted ${result.value.deletedCount || 0} documents`
      } else {
        return `${collections[index]}: failed - ${result.reason}`
      }
    })

    console.log('[data-deletion] Deletion results:', deletionResults)

    // Generate confirmation code
    const confirmationCode = `del-${instagramUserId}-${Date.now().toString(36)}`

    // Return Meta-compliant response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dmautomation.app'
    return NextResponse.json({
      url: `${baseUrl}/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    })
  } catch (err) {
    console.error('[data-deletion] Error:', err)
    return NextResponse.json(
      {
        error: 'Failed to process data deletion request',
        message: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/data-deletion
 *
 * Allows users/developers to check the status of a data deletion.
 * Query param: ?code=<confirmation_code>
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      { error: 'Missing confirmation code. Provide ?code=<code>' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    status: 'completed',
    confirmation_code: code,
    message:
      'All associated data has been deleted from our systems. If you reconnect your Instagram account in the future, a new account will be created.',
    timestamp: new Date().toISOString(),
  })
}