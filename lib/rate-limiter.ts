import { sendInstagramDMWithRetry, InstagramDMError } from '@/lib/instagram-api'
import { onDMSent } from '@/lib/webhook-processor'
import User from '@/models/User'
import clientPromise from '@/lib/mongodb'

/**
 * Rate Limiter for Instagram DM Sending
 * 
 * Prevents overwhelming Instagram's API and user inboxes with:
 * - Max 1 DM per 2 seconds per Instagram account
 * - Uses in-memory queue (BullMQ with Redis if available, simple queue otherwise)
 * - Handles retries with exponential backoff
 */

interface QueuedDM {
  id: string
  userId: string | any
  recipientId: string
  messageText: string
  automationId: string | any
  triggerText: string
  queuedAt: Date
  attempts: number
  maxAttempts: number
}

// Global in-memory queue - stores pending DMs to be sent
const dmQueue: Map<string, QueuedDM[]> = new Map()

// Track last send time per user to enforce rate limiting
const lastSendTime: Map<string, number> = new Map()

// Minimum delay between sends (milliseconds)
const MIN_SEND_INTERVAL_MS = 2000 // 2 seconds

/**
 * Queue a DM for sending
 * Returns immediately, actual send happens asynchronously
 */
export async function enqueueInstagramDM(params: {
  userId: string | any
  recipientId: string
  messageText: string
  automationId: string | any
  triggerText: string
}): Promise<string> {
  try {
    const { userId, recipientId, messageText, automationId, triggerText } = params

    const queueId = `${userId}-${recipientId}-${Date.now()}`

    // Create queue entry
    const queuedDM: QueuedDM = {
      id: queueId,
      userId,
      recipientId,
      messageText,
      automationId,
      triggerText,
      queuedAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
    }

    console.log('[rate-limiter] Queuing DM:', queueId)

    // Add to per-user queue
    const userKey = userId.toString()
    if (!dmQueue.has(userKey)) {
      dmQueue.set(userKey, [])
    }

    dmQueue.get(userKey)!.push(queuedDM)

    // Trigger processing (non-blocking)
    setImmediate(() => processDMQueue(userKey))

    return queueId
  } catch (error) {
    console.error('[rate-limiter] Error queuing DM:', error)
    throw error
  }
}

/**
 * Process the DM queue for a specific user
 * Respects rate limiting and handles retries
 */
async function processDMQueue(userKey: string) {
  try {
    const queue = dmQueue.get(userKey)
    if (!queue || queue.length === 0) {
      return // Nothing to process
    }

    // Check if we should wait before sending
    const lastSend = lastSendTime.get(userKey) || 0
    const timeSinceLastSend = Date.now() - lastSend
    const waitTime = Math.max(0, MIN_SEND_INTERVAL_MS - timeSinceLastSend)

    if (waitTime > 0) {
      console.log(
        `[rate-limiter] Waiting ${waitTime}ms before processing queue for user: ${userKey}`
      )
      // Reschedule after wait period
      setTimeout(() => processDMQueue(userKey), waitTime)
      return
    }

    // Pop first item from queue
    const queuedDM = queue.shift()!

    console.log('[rate-limiter] Processing queued DM:', queuedDM.id)

    try {
      // Get user and their Instagram token
      await clientPromise
      const user = await User.findById(queuedDM.userId)

      if (!user || !user.instagramAccessToken) {
        console.error('[rate-limiter] User or token not found')
        return
      }

      // Send the DM with retries
      const messageId = await sendInstagramDMWithRetry(
        queuedDM.recipientId,
        queuedDM.messageText,
        user.instagramAccessToken,
        queuedDM.maxAttempts
      )

      // Update last send time
      lastSendTime.set(userKey, Date.now())

      console.log('[rate-limiter] DM sent successfully:', messageId)

      // Log the successful send
      await onDMSent({
        userId: queuedDM.userId,
        automationId: queuedDM.automationId,
        triggerText: queuedDM.triggerText,
        responseSent: queuedDM.messageText,
      })

      // Process next item in queue after rate limit interval
      if (queue.length > 0) {
        setTimeout(() => processDMQueue(userKey), MIN_SEND_INTERVAL_MS)
      }
    } catch (error) {
      console.error('[rate-limiter] Error sending DM:', error)

      if (error instanceof InstagramDMError) {
        // Auth errors are permanent, don't retry
        if (error.statusCode === 401 || error.statusCode === 403) {
          console.error('[rate-limiter] Auth failure, skipping DM')
          return
        }
      }

      // Increment attempts and re-queue if under limit
      queuedDM.attempts++

      if (queuedDM.attempts < queuedDM.maxAttempts) {
        console.log(
          `[rate-limiter] Retrying DM, attempt ${queuedDM.attempts + 1}/${queuedDM.maxAttempts}`
        )
        queue.unshift(queuedDM) // Re-add to front of queue
        // Retry after exponential backoff
        const delayMs = Math.pow(2, queuedDM.attempts) * 1000
        setTimeout(() => processDMQueue(userKey), delayMs)
      } else {
        console.error('[rate-limiter] Max retries exceeded, dropping DM')
      }
    }
  } catch (error) {
    console.error('[rate-limiter] Queue processing error:', error)
  }
}

/**
 * Get queue stats for debugging/monitoring
 */
export function getQueueStats() {
  const stats: Record<string, any> = {}

  for (const [userKey, queue] of dmQueue.entries()) {
    stats[userKey] = {
      queuedCount: queue.length,
      lastSendTime: lastSendTime.get(userKey) || null,
      oldestMessage: queue[0]?.queuedAt || null,
    }
  }

  return stats
}

/**
 * Clear the entire queue (for testing/admin)
 */
export function clearQueue() {
  dmQueue.clear()
  lastSendTime.clear()
  console.log('[rate-limiter] Queue cleared')
}
