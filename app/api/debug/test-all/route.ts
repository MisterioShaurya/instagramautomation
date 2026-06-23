import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { decryptToken } from '@/lib/encryption'
import { fetchMediaComments, sendDMToCommenter, replyToComment } from '@/lib/instagram-api'

/**
 * GET /api/debug/test-all
 *
 * Runs all 3 operations (fetch comments, send DM, reply to comment)
 * on the latest reel and returns a JSON report of what passed/failed.
 *
 * WARNING: This will actually send a test DM and reply to a comment!
 * Only use on test accounts or reels with test comments.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(session.userId)
      .select('pageAccessToken instagramAccessToken instagramUserId')
      .lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tokenToUse = user.pageAccessToken || user.instagramAccessToken
    if (!tokenToUse) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    const report: any = {
      timestamp: new Date().toISOString(),
      userId: user._id.toString(),
      instagramUserId: user.instagramUserId,
      usingPageToken: !!user.pageAccessToken,
      tests: {
        fetchComments: { status: 'not_run', error: null, count: 0 },
        sendDM: { status: 'not_run', error: null },
        replyToComment: { status: 'not_run', error: null },
      },
    }

    // Step 1: Fetch the user's reels to get a media ID
    let mediaId: string | null = null
    try {
      const decrypted = decryptToken(tokenToUse)
      const igUserId = user.instagramUserId
      const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,media_product_type&access_token=${encodeURIComponent(decrypted!)}&limit=5`
      const mediaResp = await fetch(mediaUrl.toString())
      const mediaData = await mediaResp.json()

      if (mediaResp.ok && mediaData.data?.length > 0) {
        const reel = mediaData.data.find((m: any) => m.media_product_type === 'REELS') || mediaData.data[0]
        mediaId = reel.id
        report.latestMediaId = mediaId
      } else {
        report.tests.fetchComments.status = 'skipped'
        report.tests.fetchComments.error = 'No media found to test with'
        report.tests.sendDM.status = 'skipped'
        report.tests.sendDM.error = 'No media found'
        report.tests.replyToComment.status = 'skipped'
        report.tests.replyToComment.error = 'No media found'
        return NextResponse.json(report)
      }
    } catch (e: any) {
      report.tests.fetchComments.status = 'failed'
      report.tests.fetchComments.error = `Media fetch: ${e.message}`
    }

    // Step 2: Fetch comments on that media
    if (mediaId) {
      try {
        const comments = await fetchMediaComments(mediaId, tokenToUse)
        report.tests.fetchComments.status = 'passed'
        report.tests.fetchComments.count = comments.length

        if (comments.length > 0) {
          const testComment = comments[0]
          report.testCommentId = testComment.id
          report.testCommentText = testComment.text

          // Step 3: Reply to the first comment
          try {
            const replyResult = await replyToComment(testComment.id, 'Test reply from automation system 🤖', tokenToUse)
            report.tests.replyToComment.status = 'passed'
            report.tests.replyToComment.replyId = replyResult.id
          } catch (e: any) {
            report.tests.replyToComment.status = 'failed'
            report.tests.replyToComment.error = `Meta error ${e.metaErrorCode || e.statusCode}: ${e.message}`
          }

          // Step 4: Send DM via comment_id
          try {
            const dmResult = await sendDMToCommenter(testComment.id, 'Test DM from automation system 🤖', tokenToUse)
            report.tests.sendDM.status = 'passed'
            report.tests.sendDM.messageId = dmResult.message_id
          } catch (e: any) {
            report.tests.sendDM.status = 'failed'
            report.tests.sendDM.error = `Meta error ${e.metaErrorCode || e.statusCode}: ${e.message}`
          }
        } else {
          report.tests.replyToComment.status = 'skipped'
          report.tests.replyToComment.error = 'No comments to reply to'
          report.tests.sendDM.status = 'skipped'
          report.tests.sendDM.error = 'No comments to DM'
        }
      } catch (e: any) {
        report.tests.fetchComments.status = 'failed'
        report.tests.fetchComments.error = `Meta error ${e.metaErrorCode || e.statusCode}: ${e.message}`
      }
    }

    // Summary
    const allPassed = Object.values(report.tests).every((t: any) => t.status === 'passed' || t.status === 'skipped')
    report.summary = allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'

    return NextResponse.json(report)
  } catch (err) {
    console.error('[debug/test-all] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}