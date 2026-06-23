import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/mongodb'
import AutomationRule from '@/models/AutomationRule'
import User from '@/models/User'
import SentReply from '@/models/SentReply'
import ActivityLog from '@/models/ActivityLog'
import { sendDMToCommenter, replyToComment } from '@/lib/instagram-api'

// ──────────────────────────────────────────────
// 1. GET — Meta Webhook Verification Handshake
// ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('[webhook] Verification request', { mode, hasToken: !!token, hasChallenge: !!challenge })

    if (mode !== 'subscribe') {
      console.warn('[webhook] Invalid mode:', mode)
      return new NextResponse('Invalid mode', { status: 403 })
    }

    const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN
    if (!expectedToken) {
      console.error('[webhook] WEBHOOK_VERIFY_TOKEN not configured')
      return new NextResponse('Webhook not configured', { status: 500 })
    }

    if (token !== expectedToken) {
      console.warn('[webhook] Verify token mismatch')
      return new NextResponse('Invalid token', { status: 403 })
    }

    console.log('[webhook] Verification successful, returning challenge')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('[webhook] GET error:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

// ──────────────────────────────────────────────
// 2. POST — Receive Instagram Webhook Events
// ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      console.warn('[webhook] Missing X-Hub-Signature-256 header')
      return NextResponse.json({ ok: true })
    }

    const bodyText = await request.text()
    const appSecret = process.env.INSTAGRAM_APP_SECRET
    if (!appSecret) {
      console.error('[webhook] INSTAGRAM_APP_SECRET not configured')
      return NextResponse.json({ ok: true })
    }

    const hash = crypto.createHmac('sha256', appSecret).update(bodyText).digest('hex')
    const expectedSignature = `sha256=${hash}`

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn('[webhook] Invalid signature — rejecting')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('[webhook] Signature verified')

    const payload = JSON.parse(bodyText)
    if (payload.object !== 'instagram') {
      return NextResponse.json({ ok: true })
    }

    // Process each entry (fire-and-forget: ack Meta immediately)
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'comments') {
          processCommentEvent(change.value).catch((err) =>
            console.error('[webhook] Background comment processing error:', err)
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhook] POST error:', error)
    return NextResponse.json({ ok: true })
  }
}

// ──────────────────────────────────────────────
// 3. Comment Event Processing
// ──────────────────────────────────────────────
interface CommentEvent {
  id: string
  text: string
  from?: { id: string; username?: string }
  media?: { id: string }
  post_id?: string
}

async function processCommentEvent(eventData: CommentEvent) {
  await connectDB()

  const commentId = eventData.id
  const commentText = (eventData.text || '').trim()
  const commenterId = eventData.from?.id
  const mediaIdFromMedia = eventData.media?.id
  const mediaIdFromPost = eventData.post_id?.split('_')[0]
  const mediaId = mediaIdFromMedia || mediaIdFromPost

  if (!commentText || !commenterId || !mediaId) {
    console.warn('[webhook] Incomplete comment data', {
      hasText: !!commentText,
      hasCommenter: !!commenterId,
      hasMedia: !!mediaId,
    })
    return
  }

  console.log('[webhook] Processing comment', { commentId, mediaId, commenterId, text: commentText })

  // Look up active AutomationRules for this media
  const rules = await AutomationRule.find({ mediaId, active: true }).lean()

  if (!rules.length) {
    console.log('[webhook] No matching AutomationRules for media:', mediaId)
    return
  }

  console.log(`[webhook] Found ${rules.length} AutomationRules for media ${mediaId}`)

  for (const rule of rules) {
    const keyword = (rule.keyword || '').toLowerCase()
    const commentLower = commentText.toLowerCase()

    let matched = false
    if (rule.matchType === 'exact') {
      matched = commentLower === keyword
    } else {
      matched = commentLower.includes(keyword)
    }

    if (!matched) continue

    console.log(`[webhook] Rule ${rule._id} matched keyword "${rule.keyword}"`)

    // Check SentReplies dedup
    const alreadySent = await SentReply.findOne({ ruleId: rule._id, commentId }).lean()
    if (alreadySent) {
      console.log('[webhook] Already replied to this comment for rule:', rule._id)
      continue
    }

    // Find the media owner — get pageAccessToken first, fall back to user token
    const mediaOwner = await User.findById(rule.userId)
      .select('pageAccessToken instagramAccessToken')
      .lean()

    if (!mediaOwner) {
      console.warn('[webhook] User not found:', rule.userId)
      continue
    }

    // Use pageAccessToken for all operations (required for comments/DMs/replies)
    const tokenToUse = mediaOwner.pageAccessToken || mediaOwner.instagramAccessToken
    if (!tokenToUse) {
      console.warn('[webhook] No access token found for user:', rule.userId)
      await logActivity(rule.userId, rule._id, 'failed', 'No access token available')
      continue
    }

    const dmMessage = rule.dmMessage || ''
    const commentReplyMessage = rule.commentReplyMessage || ''

    // Step 1: Reply publicly to the comment (if commentReplyMessage is set)
    let commentReplySuccess = false
    let commentReplyError: string | null = null
    if (commentReplyMessage) {
      try {
        console.log('[webhook] Replying publicly to comment:', commentId)
        await replyToComment(commentId, commentReplyMessage, tokenToUse)
        console.log('[webhook] Public reply sent successfully')
        commentReplySuccess = true
      } catch (error: any) {
        commentReplyError = `Meta error ${error.metaErrorCode || error.statusCode}: ${error.message}`
        console.error('[webhook] Failed to reply publicly:', commentReplyError)
      }
    }

    // Step 2: Send DM via comment_id method (RECOMMENDED)
    let dmSuccess = false
    let dmError: string | null = null
    if (dmMessage) {
      try {
        console.log('[webhook] Sending DM via comment_id:', commentId)
        const result = await sendDMToCommenter(commentId, dmMessage, tokenToUse)
        console.log('[webhook] DM sent successfully:', result.message_id)
        dmSuccess = true
      } catch (error: any) {
        dmError = `Meta error ${error.metaErrorCode || error.statusCode}: ${error.message}`
        console.error('[webhook] Failed to send DM:', dmError)
      }
    }

    // Log to SentReplies
    if (commentReplySuccess || dmSuccess) {
      await SentReply.create({
        ruleId: rule._id,
        commentId,
        commenterId,
        sentAt: new Date(),
        replyType: commentReplySuccess && dmSuccess ? 'both' : commentReplySuccess ? 'comment' : 'dm',
      })
      console.log('[webhook] Logged sent reply to SentReplies')
    }

    // Log to ActivityLog with full error details
    if (dmError || commentReplyError) {
      await logActivity(
        rule.userId,
        rule._id,
        'failed',
        `Comment: ${commentId} | Reply: ${commentReplyError || 'OK'} | DM: ${dmError || 'OK'}`
      )
    } else if (commentReplySuccess || dmSuccess) {
      await logActivity(
        rule.userId,
        rule._id,
        'success',
        `Replied to comment ${commentId} on media ${mediaId}`
      )
    }
  }
}

async function logActivity(userId: any, ruleId: any, status: string, description: string) {
  try {
    await ActivityLog.create({
      userId,
      automationId: ruleId,
      type: status === 'success' ? 'response' : 'error',
      description,
      metadata: { status, timestamp: new Date().toISOString() },
    })
  } catch (e) {
    console.error('[webhook] Failed to log activity:', e)
  }
}