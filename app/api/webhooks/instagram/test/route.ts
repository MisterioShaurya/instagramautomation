import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import clientPromise from '@/lib/mongodb'
import User from '@/models/User'
import { processWebhookEvent } from '@/lib/webhook-processor'

/**
 * Test endpoint for webhook processing
 * POST /api/webhooks/instagram/test
 * 
 * Simulates incoming Instagram webhook events for testing automation flows
 * Requires authentication - only authenticated users can test their own automations
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventType, messageText, recipientId } = await request.json()

    // Validate input
    if (!eventType || !messageText) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, messageText' },
        { status: 400 }
      )
    }

    if (!['comment', 'message', 'story_mention', 'post_mention'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType' },
        { status: 400 }
      )
    }

    console.log('[test] Processing test webhook event', {
      userId: session.userId,
      eventType,
      messageLength: messageText.length,
    })

    // Process the event
    await processWebhookEvent({
      userId: session.userId,
      eventType: eventType as any,
      sourceId: recipientId || 'test-user-123',
      messageText: messageText,
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook event processed successfully',
      details: {
        eventType,
        messageText: messageText.substring(0, 100),
        recipientId: recipientId || 'test-user-123',
      },
    })
  } catch (error) {
    console.error('[test] Webhook test error:', error)
    return NextResponse.json(
      { error: 'Failed to process test event' },
      { status: 500 }
    )
  }
}

/**
 * Get test samples for the webhook
 * GET /api/webhooks/instagram/test
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint',
    instructions: 'Send a POST request with eventType and messageText',
    examples: [
      {
        eventType: 'comment',
        messageText: 'LINK',
        recipientId: 'ig-user-123',
      },
      {
        eventType: 'message',
        messageText: 'Hi, can you send me the product link?',
        recipientId: 'ig-user-456',
      },
      {
        eventType: 'comment',
        messageText: 'How much does this cost?',
        recipientId: 'ig-user-789',
      },
    ],
  })
}
