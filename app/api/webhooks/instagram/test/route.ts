import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import AutomationRule from '@/models/AutomationRule'
import User from '@/models/User'
import SentReply from '@/models/SentReply'
import ActivityLog from '@/models/ActivityLog'
import { sendDMToCommenter, replyToComment } from '@/lib/instagram-api'

/**
 * POST /api/webhooks/instagram/test
 *
 * Simulates a webhook comment event for testing automation flows.
 * This directly tests the AutomationRule system (not the old Automation model).
 * 
 * Request body:
 * {
 *   "mediaId": "18149570326445795",  // Required: the reel ID
 *   "commentText": "pricing",          // Required: the comment text
 *   "commentId": "test-123",           // Optional: fake comment ID
 *   "commenterId": "user-123",         // Optional: fake commenter ID
 *   "username": "testuser"             // Optional: commenter username
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mediaId, commentText, commentId, commenterId, username } = body

    if (!mediaId || !commentText) {
      return NextResponse.json(
        { error: 'mediaId and commentText are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const fakeCommentId = commentId || `test-${Date.now()}`
    const fakeCommenterId = commenterId || `user-${Date.now()}`
    const fakeUsername = username || 'testuser'

    console.log('[webhook-test] Starting test for media:', mediaId, 'comment:', commentText)

    // Look up active AutomationRules for this media
    const rules = await AutomationRule.find({
      mediaId,
      active: true,
    }).lean()

    if (!rules.length) {
      return NextResponse.json({
        success: false,
        message: `No active AutomationRules found for media: ${mediaId}`,
        debug: 'Create a rule first on the automate page for this reel',
      })
    }

    console.log(`[webhook-test] Found ${rules.length} AutomationRules`)

    const results: any[] = []

    for (const rule of rules) {
      const keyword = (rule.keyword || '').toLowerCase()
      const commentLower = commentText.toLowerCase()

      let matched = false
      if (rule.matchType === 'exact') {
        matched = commentLower === keyword
      } else {
        matched = commentLower.includes(keyword)
      }

      if (!matched) {
        results.push({
          ruleId: rule._id,
          keyword: rule.keyword,
          matched: false,
          message: `Comment "${commentText}" does not match keyword "${rule.keyword}"`,
        })
        continue
      }

      // Get user's access tokens
      const mediaOwner = await User.findById(rule.userId)
        .select('pageAccessToken instagramAccessToken')
        .lean()

      if (!mediaOwner) {
        results.push({
          ruleId: rule._id,
          keyword: rule.keyword,
          matched: true,
          error: 'User not found',
        })
        continue
      }

      const tokenToUse = mediaOwner.pageAccessToken || mediaOwner.instagramAccessToken
      if (!tokenToUse) {
        results.push({
          ruleId: rule._id,
          keyword: rule.keyword,
          matched: true,
          error: 'No access token - please reconnect Instagram',
        })
        continue
      }

      const ruleResult: any = {
        ruleId: rule._id,
        keyword: rule.keyword,
        matchType: rule.matchType,
        matched: true,
        hasToken: true,
        tokenType: mediaOwner.pageAccessToken ? 'pageAccessToken' : 'instagramAccessToken',
        dmMessage: rule.dmMessage?.substring(0, 50),
        commentReplyMessage: rule.commentReplyMessage?.substring(0, 50),
        publicReply: { status: 'not_tried' },
        dm: { status: 'not_tried' },
      }

      // Test public reply
      if (rule.commentReplyMessage) {
        try {
          console.log('[webhook-test] Testing public reply...')
          const replyResult = await replyToComment(fakeCommentId, rule.commentReplyMessage, tokenToUse)
          ruleResult.publicReply = {
            status: 'passed',
            response: replyResult,
          }
        } catch (error: any) {
          ruleResult.publicReply = {
            status: 'failed',
            error: error.message,
            metaErrorCode: error.metaErrorCode,
            statusCode: error.statusCode,
          }
        }
      }

      // Test DM
      if (rule.dmMessage) {
        try {
          console.log('[webhook-test] Testing DM...')
          const dmResult = await sendDMToCommenter(fakeCommentId, rule.dmMessage, tokenToUse)
          ruleResult.dm = {
            status: 'passed',
            messageId: dmResult.message_id,
          }
        } catch (error: any) {
          ruleResult.dm = {
            status: 'failed',
            error: error.message,
            metaErrorCode: error.metaErrorCode,
            statusCode: error.statusCode,
          }
        }
      }

      results.push(ruleResult)

      // Log to ActivityLog
      try {
        await ActivityLog.create({
          userId: session.userId,
          automationId: rule._id,
          type: 'test',
          description: `Test: comment="${commentText}" keyword="${rule.keyword}" reply=${ruleResult.publicReply.status} dm=${ruleResult.dm.status}`,
          metadata: { mediaId, commentText, commentId: fakeCommentId, test: true },
        })
      } catch (e) { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      mediaId,
      commentText,
      commentId: fakeCommentId,
      rulesFound: rules.length,
      results,
    })
  } catch (error) {
    console.error('[webhook-test] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/instagram/test
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook Test Debug Endpoint',
    usage: 'POST with JSON body: { "mediaId": "REEL_ID", "commentText": "test keyword", "commentId": "optional-id", "commenterId": "optional", "username": "optional" }',
    instructions: [
      '1. Go to /dashboard/reels and click a reel to see its ID in the URL',
      '2. Create a rule for that reel with a keyword and DM message',
      '3. POST to this endpoint with that mediaId and matching commentText',
      '4. Check the response for exact Meta API error messages',
    ],
    debug_endpoints: [
      'GET /api/debug/permissions - Check your token scopes',
      'GET /api/debug/test-all - Run ALL operations on your latest reel',
    ],
  })
}