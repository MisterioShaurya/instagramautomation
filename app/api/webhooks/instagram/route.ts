import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/mongodb'
import AutomationRule from '@/models/AutomationRule'
import User from '@/models/User'
import SentReply from '@/models/SentReply'
import { sendInstagramPrivateReply, replyToComment } from '@/lib/instagram-api'

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
    // ── Verify X-Hub-Signature-256 ──────────
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

    const hash = crypto
      .createHmac('sha256', appSecret)
      .update(bodyText)
      .digest('hex')
    const expectedSignature = `sha256=${hash}`

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      console.warn('[webhook] Invalid signature — rejecting')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('[webhook] Signature verified')

    // ── Parse payload ────────────────────────
    const payload = JSON.parse(bodyText)

    if (payload.object !== 'instagram') {
      return NextResponse.json({ ok: true })
    }

    // Process each entry (fire-and-forget: we ack Meta immediately)
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

  // ── Look up active AutomationRules for this media ──
  const rules = await AutomationRule.find({
    mediaId,
    active: true,
  }).lean()

  if (!rules.length) {
    console.log('[webhook] No matching AutomationRules for media:', mediaId)
    return
  }

  console.log(`[webhook] Found ${rules.length} AutomationRules for media ${mediaId}`)

  // ── Match each rule against the comment text ──
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

    console.log(`[webhook] Rule ${rule._id} matched keyword "${rule.keyword}" (${rule.matchType})`)

    // ── Check SentReplies dedup ─────────────────
    const alreadySent = await SentReply.findOne({
      ruleId: rule._id,
      commentId,
    }).lean()

    if (alreadySent) {
      console.log('[webhook] Already replied to this comment for rule:', rule._id)
      continue
    }

    // ── Find the media owner's access token ─────
    const mediaOwner = await User.findById(rule.userId)
      .select('instagramAccessToken')
      .lean()

    if (!mediaOwner?.instagramAccessToken) {
      console.warn('[webhook] No access token found for user:', rule.userId)
      continue
    }

    const dmMessage = rule.dmMessage || ''
    const commentReplyMessage = rule.commentReplyMessage || ''

    // ── Step 1: Reply publicly to the comment (if commentReplyMessage is set) ──
    let commentReplySuccess = false
    if (commentReplyMessage) {
      try {
        console.log('[webhook] Replying publicly to comment:', commentId)
        await replyToComment(commentId, commentReplyMessage, mediaOwner.instagramAccessToken)
        console.log('[webhook] Public reply sent successfully for comment:', commentId)
        commentReplySuccess = true
      } catch (error: any) {
        console.error('[webhook] Failed to reply publicly to comment', {
          ruleId: rule._id,
          commentId,
          error: error.message,
          statusCode: error.statusCode,
        })
        // Continue to DM even if public reply fails
      }
    }

    // ── Step 2: Send private reply (DM) ────
    let dmSuccess = false
    if (dmMessage) {
      try {
        const result = await sendInstagramPrivateReply(
          commentId,
          dmMessage,
          mediaOwner.instagramAccessToken
        )
        console.log('[webhook] Private reply (DM) sent successfully', {
          ruleId: rule._id,
          commentId,
          result,
        })
        dmSuccess = true
      } catch (error: any) {
        console.error('[webhook] Failed to send private reply (DM)', {
          ruleId: rule._id,
          commentId,
          error: error.message,
          statusCode: error.statusCode,
        })
      }
    }

    // ── Mark as processed even if one action succeeded ──
    if (commentReplySuccess || dmSuccess) {
      await SentReply.create({
        ruleId: rule._id,
        commentId,
        commenterId,
        sentAt: new Date(),
        replyType: commentReplySuccess && dmSuccess ? 'both' : commentReplySuccess ? 'comment' : 'dm',
      })
      console.log('[webhook] Logged sent reply to SentReplies for dedup')
    } else {
      console.warn('[webhook] Both public reply and DM failed — not logging in SentReplies')
    }
  }
}