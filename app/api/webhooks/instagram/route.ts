import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/mongodb'
import AutomationRule from '@/models/AutomationRule'
import User from '@/models/User'
import SentReply from '@/models/SentReply'
import { sendInstagramPrivateReply } from '@/lib/instagram-api'

// ──────────────────────────────────────────────
// 1. GET — Meta Webhook Verification Handshake
// ──────────────────────────────────────────────
// Meta sends: GET /api/webhooks/instagram?
//   hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
//
// We must respond with the challenge as plain text if verify_token matches.
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
    // Meta expects the challenge as plain text, not JSON
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
// Meta posts JSON bodies with X-Hub-Signature-256 for verification.
// We process comment events by matching against AutomationRules and
// sending private replies via the Graph API.
export async function POST(request: NextRequest) {
  try {
    // ── Verify X-Hub-Signature-256 ──────────
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      console.warn('[webhook] Missing X-Hub-Signature-256 header')
      // Still return 200 so Meta doesn't retry; log as warning
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

    // Use timing-safe comparison
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
          // We don't await — process in background so Meta gets a fast 200
          processCommentEvent(change.value).catch((err) =>
            console.error('[webhook] Background comment processing error:', err)
          )
        }
      }
    }

    // Always return 200 OK immediately to Meta
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
  id: string                // Instagram comment ID
  text: string              // Comment body
  from?: { id: string; username?: string }
  media?: { id: string }    // The reel/post that was commented on
  post_id?: string          // Alternative field for media ID (format: "mediaId_pageId")
}

async function processCommentEvent(eventData: CommentEvent) {
  // Ensure MongoDB connection is established before any model operations
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

  console.log('[webhook] Processing comment', { commentId, mediaId, commenterId })

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
      // Default: 'contains'
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
    // The AutomationRule has a userId; look up that user's Instagram token
    const mediaOwner = await User.findById(rule.userId)
      .select('instagramAccessToken instagramAccessTokenEncrypted')
      .lean()

    if (!mediaOwner?.instagramAccessToken) {
      console.warn('[webhook] No access token found for user:', rule.userId)
      continue
    }

    // ── Build the DM message (append disclosure note) ──
    const dmMessage = rule.dmMessage || ''

    // Log that an automated message is being sent (for future compliance disclosure)
    console.log(
      '[webhook][compliance] Sending automated private reply — consider adding "you are talking to a bot" disclosure to dmMessage',
      {
        ruleId: rule._id,
        commentId,
        commenterId,
        mediaId,
        dmMessagePreview: dmMessage.substring(0, 80),
      }
    )

    // ── Send the private reply via Graph API ────
    try {
      const result = await sendInstagramPrivateReply(
        commentId,
        dmMessage,
        mediaOwner.instagramAccessToken
      )

      console.log('[webhook] Private reply sent successfully', {
        ruleId: rule._id,
        commentId,
        result,
      })

      // ── Log in SentReplies ──────────────────────
      await SentReply.create({
        ruleId: rule._id,
        commentId,
        commenterId,
        sentAt: new Date(),
      })

      console.log('[webhook] Logged sent reply to SentReplies for dedup')
    } catch (error: any) {
      console.error('[webhook] Failed to send private reply', {
        ruleId: rule._id,
        commentId,
        error: error.message,
        statusCode: error.statusCode,
      })
      // Don't throw — continue to other rules
    }
  }
}