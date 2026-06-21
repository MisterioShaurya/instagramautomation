import clientPromise from '@/lib/mongodb'
import User from '@/models/User'
import Automation from '@/models/Automation'
import ActivityLog from '@/models/ActivityLog'
import { decryptToken } from '@/lib/encryption'
import { generateAIResponse } from '@/lib/claude-integration'
import { sendInstagramDM, InstagramDMError } from '@/lib/instagram-api'
import { enqueueInstagramDM } from '@/lib/rate-limiter'

interface WebhookEventContext {
  userId: string | any // ObjectId
  eventType: 'comment' | 'message' | 'story_mention' | 'post_mention'
  sourceId: string // Instagram user ID who sent the message
  messageText: string // The actual comment/DM text
  commentId?: string
  messageId?: string
}

/**
 * Main webhook event processor
 * Orchestrates keyword matching, automation lookup, response generation, and DM sending
 */
export async function processWebhookEvent(context: WebhookEventContext) {
  try {
    const { userId, eventType, sourceId, messageText } = context

    console.log('[processor] Processing webhook event', {
      userId,
      eventType,
      messageLength: messageText.length,
    })

    // Connect to database
    await clientPromise

    // 1. Find all active automations for this user that match the event type
    const automations = await Automation.find({
      userId: userId,
      enabled: true,
      status: 'active',
      'trigger.type': getTriggerTypeForEvent(eventType),
    })

    if (automations.length === 0) {
      console.log('[processor] No matching automations found')
      return
    }

    // 2. Try to match against automation triggers (keywords)
    for (const automation of automations) {
      const isMatched = matchKeywords(messageText, automation.trigger)

      if (!isMatched) {
        console.log('[processor] No keyword match for automation:', automation._id)
        continue
      }

      console.log('[processor] Matched automation:', automation.name)

      // 3. Generate response (either static or AI)
      let responseText: string

      if (automation.responseType === 'ai' && automation.aiEnabled) {
        try {
          responseText = await generateAIResponse({
            userMessage: messageText,
            systemPrompt: automation.aiInstructions,
            tone: automation.aiTone,
          })
        } catch (error) {
          console.error('[processor] AI generation failed, falling back to static:', error)
          responseText = automation.responseContent.message || 'Thank you for reaching out!'
        }
      } else {
        // Use static response
        responseText = automation.responseContent.message || 'Thank you for reaching out!'
      }

      // 4. Queue DM for sending with rate limiting
      try {
        await enqueueInstagramDM({
          userId: userId,
          recipientId: sourceId,
          messageText: responseText,
          automationId: automation._id,
          triggerText: messageText,
        })

        console.log('[processor] DM queued for sending')

        // 5. Log the activity
        await ActivityLog.create({
          userId: userId,
          automationId: automation._id,
          type: 'trigger',
          description: `Triggered on ${eventType}: "${messageText.substring(0, 50)}..."`,
          metadata: {
            eventType,
            messageText,
            sourceId,
            responseType: automation.responseType,
          },
        })

        // 6. Increment automation stats
        await Automation.updateOne(
          { _id: automation._id },
          {
            $inc: { 'stats.timesTriggered': 1 },
            $set: { 'stats.lastTriggeredAt': new Date() },
          }
        )
      } catch (error) {
        console.error('[processor] Error handling automation:', error)
        // Log the error but continue processing other automations
      }
    }
  } catch (error) {
    console.error('[processor] Webhook processing error:', error)
    throw error
  }
}

/**
 * Map webhook event type to automation trigger type
 */
function getTriggerTypeForEvent(eventType: string): string {
  const mapping: Record<string, string> = {
    comment: 'comment_keyword',
    message: 'dm_keyword',
    story_mention: 'story_mention',
    post_mention: 'post_mention',
  }
  return mapping[eventType] || 'comment_keyword'
}

/**
 * Check if message text matches automation keywords
 * Supports different match types: exact, contains, starts_with
 */
function matchKeywords(messageText: string, trigger: any): boolean {
  if (!trigger.keywords || trigger.keywords.length === 0) {
    return false // No keywords configured
  }

  const text = messageText.toLowerCase()
  const matchType = trigger.matchType || 'contains'

  return trigger.keywords.some((keyword: string) => {
    const lowerKeyword = keyword.toLowerCase()

    switch (matchType) {
      case 'exact':
        return text === lowerKeyword
      case 'starts_with':
        return text.startsWith(lowerKeyword)
      case 'contains':
      default:
        return text.includes(lowerKeyword)
    }
  })
}

/**
 * Post-send processing after DM is successfully delivered
 * Called by rate limiter after actually sending the DM
 */
export async function onDMSent(params: {
  userId: string | any
  automationId: string | any
  triggerText: string
  responseSent: string
}) {
  try {
    const { userId, automationId, triggerText, responseSent } = params

    // Log successful response
    await ActivityLog.create({
      userId: userId,
      automationId: automationId,
      type: 'response',
      description: `Sent automated reply: "${responseSent.substring(0, 50)}..."`,
      metadata: {
        triggerText,
        responseSent,
      },
    })

    // Increment response stats
    await Automation.updateOne(
      { _id: automationId },
      {
        $inc: { 'stats.responsesCount': 1 },
      }
    )

    console.log('[processor] DM sent and logged for automation:', automationId)
  } catch (error) {
    console.error('[processor] Error logging DM send:', error)
  }
}
