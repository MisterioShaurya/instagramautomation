import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import FetchedComment from '@/models/FetchedComment'
import SentReply from '@/models/SentReply'
import AutomationRule from '@/models/AutomationRule'
import { fetchMediaComments } from '@/lib/instagram-api'

/**
 * GET /api/instagram/comments?mediaId=xxx
 *
 * Fetches comments for a specific media (reel) from Instagram Graph API,
 * saves them to MongoDB (FetchedComment collection), and returns them
 * enriched with reply status from SentReplies.
 *
 * Uses the PAGE access token (stored as pageAccessToken in User model).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId query parameter is required' }, { status: 400 })
    }

    await connectDB()

    // Get user with pageAccessToken (required for comments API)
    const user = await User.findById(session.userId)
      .select('pageAccessToken instagramAccessToken instagramAccessTokenEncrypted')
      .lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use pageAccessToken if available, otherwise fall back to user token
    const tokenToUse = user.pageAccessToken || user.instagramAccessToken
    if (!tokenToUse) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please reconnect.' },
        { status: 400 }
      )
    }

    // Fetch comments from Instagram Graph API using page access token
    let comments: any[] = []
    let apiError: string | null = null
    try {
      comments = await fetchMediaComments(mediaId, tokenToUse)
    } catch (err: any) {
      apiError = err.message || 'Unknown API error'
      console.error('[comments] Instagram API error:', err.message)
      // If pageAccessToken failed and we have a user token, try getting a fresh page token
      if (user.pageAccessToken && user.instagramAccessToken && err.metaErrorCode !== 401) {
        // Try with user token directly
        try {
          comments = await fetchMediaComments(mediaId, user.instagramAccessToken)
          apiError = null
        } catch (err2: any) {
          apiError = err2.message
        }
      }
    }

    // Save fetched comments to MongoDB
    if (comments.length > 0) {
      for (const comment of comments) {
        try {
          await FetchedComment.findOneAndUpdate(
            { commentId: comment.id },
            {
              mediaId,
              commentId: comment.id,
              text: comment.text || '',
              username: comment.from?.username || comment.username || 'unknown',
              userId: comment.from?.id || '',
              timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date(),
              fetchedAt: new Date(),
            },
            { upsert: true }
          )
        } catch (e) {
          // Ignore duplicate key errors
        }
      }
    }

    // Get SentReplies for this user's rules on this media
    const rules = await AutomationRule.find({
      userId: session.userId,
      mediaId,
    }).select('_id keyword').lean()

    const ruleIds = rules.map(r => r._id)
    const sentReplies = await SentReply.find({
      ruleId: { $in: ruleIds },
    }).select('commentId').lean()

    const repliedCommentIds = new Set(sentReplies.map(sr => sr.commentId))

    // Enrich comments with reply status
    const enrichedComments = comments.map((comment: any) => ({
      id: comment.id,
      text: comment.text,
      timestamp: comment.timestamp,
      username: comment.from?.username || comment.username || 'unknown',
      commenterId: comment.from?.id || '',
      replied: repliedCommentIds.has(comment.id),
    }))

    return NextResponse.json({
      comments: enrichedComments,
      total: enrichedComments.length,
      repliedCount: sentReplies.length,
      apiError,
    })
  } catch (err) {
    console.error('[comments] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}