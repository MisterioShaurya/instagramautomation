import { decryptToken } from '@/lib/encryption'

/**
 * Instagram Graph API Integration
 * Handles sending direct messages via the Meta Graph API
 */

export class InstagramDMError extends Error {
  constructor(
    public statusCode: number,
    public metaErrorCode: number | null,
    message: string
  ) {
    super(message)
    this.name = 'InstagramDMError'
  }
}

/**
 * Send a DM to an Instagram user
 * 
 * @param recipientId Instagram user ID to send DM to
 * @param messageText The message content
 * @param accessToken User's Instagram Page Access Token (encrypted in DB)
 * @returns The message ID if successful
 */
export async function sendInstagramDM(
  recipientId: string,
  messageText: string,
  accessToken: string
): Promise<string> {
  try {
    console.log('[instagram] Sending DM to:', recipientId)

    if (!accessToken) {
      throw new InstagramDMError(401, null, 'Instagram access token not found')
    }

    // Decrypt the access token before use
    const decryptedToken = decryptToken(accessToken)

    if (!decryptedToken) {
      throw new InstagramDMError(401, null, 'Failed to decrypt access token')
    }

    // Ensure message is not too long (Instagram limit is ~1000 chars per DM)
    const truncatedMessage = messageText.substring(0, 1000)

    // Call Meta Graph API to send the message
    // Endpoint: POST /ig_hashtag_search/me/messages
    // We're sending via the Page API: POST /me/messages
    const response = await fetch(
      'https://graph.facebook.com/v19.0/me/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: truncatedMessage,
          },
          access_token: decryptedToken,
        }),
      }
    )

    const data = await response.json()

    // Handle API errors
    if (!response.ok) {
      const errorCode = data.error?.code
      const errorMessage = data.error?.message || 'Unknown error'

      // 429 = Rate limited
      if (response.status === 429) {
        console.warn('[instagram] Rate limited:', errorMessage)
        throw new InstagramDMError(429, errorCode, `Rate limited: ${errorMessage}`)
      }

      // 401/403 = Auth failure (likely expired token)
      if (response.status === 401 || response.status === 403) {
        console.error('[instagram] Auth failure:', errorMessage)
        throw new InstagramDMError(response.status, errorCode, `Auth failed: ${errorMessage}`)
      }

      // Other errors
      console.error('[instagram] API error:', errorMessage)
      throw new InstagramDMError(response.status, errorCode, errorMessage)
    }

    const messageId = data.message_id

    if (!messageId) {
      throw new InstagramDMError(500, null, 'No message ID in response')
    }

    console.log('[instagram] DM sent successfully, message ID:', messageId)
    return messageId
  } catch (error) {
    if (error instanceof InstagramDMError) {
      throw error
    }

    console.error('[instagram] Unexpected error:', error)
    throw new InstagramDMError(
      500,
      null,
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Retry sending a DM with exponential backoff
 * Handles transient failures like rate limiting
 * 
 * @param recipientId Instagram user ID
 * @param messageText Message content
 * @param accessToken Encrypted access token
 * @param maxRetries Maximum number of retry attempts
 */
export async function sendInstagramDMWithRetry(
  recipientId: string,
  messageText: string,
  accessToken: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: InstagramDMError | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendInstagramDM(recipientId, messageText, accessToken)
    } catch (error) {
      if (!(error instanceof InstagramDMError)) {
        throw error
      }

      lastError = error

      // Don't retry auth errors
      if (error.statusCode === 401 || error.statusCode === 403) {
        throw error
      }

      // Calculate exponential backoff delay
      // 1st retry: 2 seconds, 2nd retry: 4 seconds, 3rd retry: 8 seconds
      const delayMs = Math.pow(2, attempt + 1) * 1000

      if (attempt < maxRetries - 1) {
        console.log(
          `[instagram] Retry attempt ${attempt + 1}/${maxRetries - 1}, waiting ${delayMs}ms`
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    throw lastError
  }

  throw new InstagramDMError(500, null, 'Failed to send DM after all retries')
}

/**
 * Send a private reply to an Instagram comment via the private_replies API.
 * POST https://graph.instagram.com/v21.0/{ig-comment-id}/private_replies
 *
 * This is the correct endpoint for sending automated DM replies to commenters.
 */
export async function sendInstagramPrivateReply(
  commentId: string,
  messageText: string,
  accessToken: string
): Promise<{ id: string }> {
  try {
    console.log('[instagram] Sending private reply to comment:', commentId)

    if (!accessToken) {
      throw new InstagramDMError(401, null, 'Instagram access token not found')
    }

    const decryptedToken = decryptToken(accessToken)
    if (!decryptedToken) {
      throw new InstagramDMError(401, null, 'Failed to decrypt access token')
    }

    // Instagram DM limit is ~1000 chars
    const truncatedMessage = messageText.substring(0, 1000)

    // Meta Graph API requires access_token as a query parameter, NOT in the JSON body
    // Ref: https://developers.facebook.com/docs/instagram-api/reference/ig-comment/private_replies
    const url = `https://graph.instagram.com/v21.0/${commentId}/private_replies?access_token=${encodeURIComponent(decryptedToken)}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: truncatedMessage,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorCode = data.error?.code
      const errorMessage = data.error?.message || 'Unknown error'
      const fullError = data.error ? JSON.stringify(data.error) : errorMessage

      if (response.status === 429) {
        console.warn('[instagram] Rate limited on private reply:', errorMessage)
        throw new InstagramDMError(429, errorCode, `Rate limited: ${errorMessage}`)
      }

      if (response.status === 401 || response.status === 403) {
        console.error('[instagram] Auth failure on private reply:', fullError)
        throw new InstagramDMError(response.status, errorCode, `Auth failed: ${errorMessage}`)
      }

      console.error('[instagram] Private reply API error:', fullError)
      throw new InstagramDMError(response.status, errorCode, errorMessage)
    }

    console.log('[instagram] Private reply sent successfully, response:', JSON.stringify(data))
    return data
  } catch (error) {
    if (error instanceof InstagramDMError) {
      throw error
    }
    console.error('[instagram] Unexpected error sending private reply:', error)
    throw new InstagramDMError(
      500,
      null,
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Reply to an Instagram comment publicly via the Graph API.
 * POST https://graph.instagram.com/v21.0/{ig-comment-id}/replies
 *
 * This replies publicly to the comment on the reel/post.
 */
export async function replyToComment(
  commentId: string,
  messageText: string,
  accessToken: string
): Promise<{ id: string }> {
  try {
    console.log('[instagram] Replying to comment:', commentId)

    if (!accessToken) {
      throw new InstagramDMError(401, null, 'Instagram access token not found')
    }

    const decryptedToken = decryptToken(accessToken)
    if (!decryptedToken) {
      throw new InstagramDMError(401, null, 'Failed to decrypt access token')
    }

    const truncatedMessage = messageText.substring(0, 1000)

    // Meta Graph API requires access_token as query param
    const url = `https://graph.instagram.com/v21.0/${commentId}/replies?access_token=${encodeURIComponent(decryptedToken)}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: truncatedMessage,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Unknown error'
      const fullError = data.error ? JSON.stringify(data.error) : errorMessage
      console.error('[instagram] Reply to comment API error:', fullError)
      throw new InstagramDMError(response.status, data.error?.code, errorMessage)
    }

    console.log('[instagram] Reply to comment sent successfully:', JSON.stringify(data))
    return data
  } catch (error) {
    if (error instanceof InstagramDMError) throw error
    console.error('[instagram] Unexpected error replying to comment:', error)
    throw new InstagramDMError(500, null, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Fetch comments for a specific media (reel/post) from Instagram.
 * GET https://graph.instagram.com/v21.0/{mediaId}/comments
 */
export async function fetchMediaComments(
  mediaId: string,
  accessToken: string
): Promise<any[]> {
  try {
    console.log('[instagram] Fetching comments for media:', mediaId)

    const decryptedToken = decryptToken(accessToken)
    if (!decryptedToken) {
      throw new InstagramDMError(401, null, 'Failed to decrypt access token')
    }

    const url = `https://graph.instagram.com/v21.0/${mediaId}/comments?access_token=${encodeURIComponent(decryptedToken)}&fields=id,text,timestamp,username,from{id,username}`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Unknown error'
      console.error('[instagram] Fetch comments API error:', errorMessage)
      throw new InstagramDMError(response.status, data.error?.code, errorMessage)
    }

    console.log(`[instagram] Fetched ${data.data?.length || 0} comments for media ${mediaId}`)
    return data.data || []
  } catch (error) {
    if (error instanceof InstagramDMError) throw error
    console.error('[instagram] Unexpected error fetching comments:', error)
    throw new InstagramDMError(500, null, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Send a DM with a link
 * Instagram allows including URLs, they'll be shortened in the UI
 */
export async function sendInstagramDMWithLink(
  recipientId: string,
  messageText: string,
  linkUrl: string,
  accessToken: string
): Promise<string> {
  const fullMessage = `${messageText}\n\n${linkUrl}`
  return sendInstagramDMWithRetry(recipientId, fullMessage, accessToken)
}

/**
 * Get Instagram account info from Meta
 * Useful for validating tokens and getting user details
 */
export async function getInstagramAccountInfo(accessToken: string): Promise<any> {
  try {
    const decryptedToken = decryptToken(accessToken)

    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account&access_token=${decryptedToken}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get account info')
    }

    return data
  } catch (error) {
    console.error('[instagram] Failed to get account info:', error)
    throw error
  }
}
