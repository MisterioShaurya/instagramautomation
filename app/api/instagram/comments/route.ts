import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import SentReply from '@/models/SentReply'
import AutomationRule from '@/models/AutomationRule'
import { fetchMediaComments } from '@/lib/instagram-api'

/**
 * GET /api/instagram/comments?mediaId=xxx
 *
 * Fetches comments for a specific media (reel) from Instagram Graph API
 * and enriches them with our internal reply status.
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

    // Get user's access token
    const user = await User.findById(session.userId)
      .select('instagramAccessToken instagramAccessTokenEncrypted instagramUserId')
      .lean()

    if (!user?.instagramAccessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please reconnect.' },
        { status: 400 }
      )
    }

    // Fetch comments from Instagram
    let comments: any[] = []
    try {
      comments = await fetchMediaComments(mediaId, user.instagramAccessToken)
    } catch (err: any) {
      console.error('[comments] Failed to fetch from Instagram:', err.message)
      // Return empty array if Instagram API fails
    }

    // Get all SentReplies for this user's rules on this media
    const rules = await AutomationRule.find({
      userId: session.userId,
      mediaId,
    }).select('_id keyword').lean()

    const ruleIds = rules.map(r => r._id)

    const sentReplies = await SentReply.find({
      ruleId: { $in: ruleIds },
    }).select('commentId commenterId sentAt').lean()

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
    })
  } catch (err) {
    console.error('[comments] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}