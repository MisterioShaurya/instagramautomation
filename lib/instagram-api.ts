import { decryptToken, encryptToken } from '@/lib/encryption'

/**
 * Instagram Graph API Integration v19.0
 * 
 * IMPORTANT: All comment/DM/reply operations require a 
 * FACEBOOK PAGE ACCESS TOKEN, not a user token.
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
 * Get a Page Access Token from a User Access Token.
 * The user token must have pages_manage_metadata or pages_read_engagement permission.
 * 
 * GET https://graph.facebook.com/v19.0/me/accounts?access_token={user_token}
 * Returns the page access token for the first page with instagram business account.
 */
export async function getPageAccessToken(userAccessToken: string): Promise<{ pageId: string; pageAccessToken: string; pageName: string } | null> {
  try {
    const decrypted = decryptToken(userAccessToken)
    if (!decrypted) return null

    const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(decrypted)}&fields=id,name,access_token,instagram_business_account{id,username}`
    const resp = await fetch(url.toString())
    const data = await resp.json()

    if (!resp.ok) {
      console.error('[ig-api] Failed to fetch pages:', data.error?.message)
      return null
    }

    const pages = data.data || []
    const pageWithIg = pages.find((p: any) => p.instagram_business_account)
    if (!pageWithIg) return null

    return {
      pageId: pageWithIg.id,
      pageAccessToken: pageWithIg.access_token,
      pageName: pageWithIg.name,
    }
  } catch (err) {
    console.error('[ig-api] getPageAccessToken error:', err)
    return null
  }
}

/**
 * Fetch comments on a media (reel) from Instagram Graph API.
 * Requires a PAGE access token with instagram_manage_comments permission.
 * 
 * GET https://graph.facebook.com/v19.0/{media-id}/comments
 *   ?fields=id,text,username,timestamp,from
 *   &access_token={page_access_token}
 */
export async function fetchMediaComments(
  mediaId: string,
  pageAccessToken: string
): Promise<any[]> {
  const decryptedToken = decryptToken(pageAccessToken)
  if (!decryptedToken) {
    throw new InstagramDMError(401, null, 'Failed to decrypt page access token')
  }

  const url = `https://graph.facebook.com/v19.0/${mediaId}/comments?fields=id,text,username,timestamp,from&access_token=${encodeURIComponent(decryptedToken)}`
  console.log('[ig-api] Fetching comments for media:', mediaId)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    const fullError = data.error ? JSON.stringify(data.error) : 'Unknown error'
    console.error('[ig-api] Fetch comments error:', fullError)
    throw new InstagramDMError(response.status, data.error?.code, `Fetch comments failed: ${data.error?.message || 'Unknown'}`)
  }

  console.log(`[ig-api] Fetched ${data.data?.length || 0} comments for media ${mediaId}`)
  return data.data || []
}

/**
 * Send a DM triggered by a comment.
 * Method A (RECOMMENDED for comment-triggered DMs):
 * POST https://graph.facebook.com/v19.0/me/messages
 * Body: { recipient: { comment_id: "COMMENT_ID" }, message: { text: "..." }, messaging_type: "RESPONSE" }
 * Query: access_token={page_access_token}
 * 
 * This has fewer permission requirements than sending a DM to a user ID.
 */
export async function sendDMToCommenter(
  commentId: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ message_id: string }> {
  const decryptedToken = decryptToken(pageAccessToken)
  if (!decryptedToken) {
    throw new InstagramDMError(401, null, 'Failed to decrypt page access token')
  }

  const truncatedMessage = messageText.substring(0, 1000)
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(decryptedToken)}`

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: truncatedMessage },
      messaging_type: 'RESPONSE',
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errorCode = data.error?.code
    const errorMessage = data.error?.message || 'Unknown error'
    const fullError = data.error ? JSON.stringify(data.error) : errorMessage
    console.error('[ig-api] DM via comment_id failed:', fullError)
    throw new InstagramDMError(response.status, errorCode, `DM failed: ${errorMessage}`)
  }

  console.log('[ig-api] DM sent successfully via comment_id:', commentId, 'message_id:', data.message_id)
  return data
}

/**
 * Send a DM to an Instagram user (used for DM-triggered automations).
 * Method B:
 * POST https://graph.facebook.com/v19.0/me/messages
 * Body: { recipient: { id: "INSTAGRAM_USER_SCOPED_ID" }, message: { text: "..." }, messaging_type: "RESPONSE" }
 * Query: access_token={page_access_token}
 */
export async function sendInstagramDM(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<string> {
  const decryptedToken = decryptToken(pageAccessToken)
  if (!decryptedToken) {
    throw new InstagramDMError(401, null, 'Failed to decrypt page access token')
  }

  const truncatedMessage = messageText.substring(0, 1000)
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(decryptedToken)}`

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: truncatedMessage },
      messaging_type: 'RESPONSE',
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errorCode = data.error?.code
    const errorMessage = data.error?.message || 'Unknown error'

    if (response.status === 429) {
      throw new InstagramDMError(429, errorCode, `Rate limited: ${errorMessage}`)
    }
    if (response.status === 401 || response.status === 403) {
      throw new InstagramDMError(response.status, errorCode, `Auth failed: ${errorMessage}`)
    }

    throw new InstagramDMError(response.status, errorCode, errorMessage)
  }

  const messageId = data.message_id
  if (!messageId) {
    throw new InstagramDMError(500, null, 'No message ID in response')
  }

  console.log('[ig-api] DM sent successfully, message ID:', messageId)
  return messageId
}

/**
 * Reply publicly to a comment on a reel.
 * POST https://graph.facebook.com/v19.0/{comment-id}/replies
 * Body: { "message": "your reply text" }
 * Query: access_token={page_access_token}
 * Requires: instagram_manage_comments permission
 */
export async function replyToComment(
  commentId: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ id: string }> {
  const decryptedToken = decryptToken(pageAccessToken)
  if (!decryptedToken) {
    throw new InstagramDMError(401, null, 'Failed to decrypt page access token')
  }

  const truncatedMessage = messageText.substring(0, 1000)
  const url = `https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${encodeURIComponent(decryptedToken)}`

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: truncatedMessage }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data.error?.message || 'Unknown error'
    const fullError = data.error ? JSON.stringify(data.error) : errorMessage
    console.error('[ig-api] Reply to comment error:', fullError)
    throw new InstagramDMError(response.status, data.error?.code, `Reply failed: ${errorMessage}`)
  }

  console.log('[ig-api] Reply to comment sent:', JSON.stringify(data))
  return data
}

/**
 * Send a DM triggered by a comment (legacy method using private_replies endpoint).
 * Kept for backward compatibility but sendDMToCommenter is preferred.
 */
export async function sendInstagramPrivateReply(
  commentId: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ id: string }> {
  const decryptedToken = decryptToken(pageAccessToken)
  if (!decryptedToken) {
    throw new InstagramDMError(401, null, 'Failed to decrypt page access token')
  }

  const truncatedMessage = messageText.substring(0, 1000)
  const url = `https://graph.facebook.com/v19.0/${commentId}/private_replies?access_token=${encodeURIComponent(decryptedToken)}`

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: truncatedMessage }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data.error?.message || 'Unknown error'
    const fullError = data.error ? JSON.stringify(data.error) : errorMessage
    console.error('[ig-api] Private reply error:', fullError)
    throw new InstagramDMError(response.status, data.error?.code, `Private reply failed: ${errorMessage}`)
  }

  console.log('[ig-api] Private reply sent:', JSON.stringify(data))
  return data
}

/**
 * Retry sending a DM with exponential backoff.
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
      if (!(error instanceof InstagramDMError)) throw error
      lastError = error
      if (error.statusCode === 401 || error.statusCode === 403) throw error

      const delayMs = Math.pow(2, attempt + 1) * 1000
      if (attempt < maxRetries - 1) {
        console.log(`[ig-api] Retry ${attempt + 1}/${maxRetries - 1}, waiting ${delayMs}ms`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
  if (lastError) throw lastError
  throw new InstagramDMError(500, null, 'Failed after all retries')
}

/**
 * Fetch Instagram business account info.
 */
export async function getInstagramAccountInfo(accessToken: string): Promise<any> {
  const decryptedToken = decryptToken(accessToken)
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account&access_token=${decryptedToken}`
  )
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Failed to get account info')
  return data
}

/**
 * Debug token: Check token validity, scopes, and expiry.
 * GET https://graph.facebook.com/debug_token?input_token={token}&access_token={app_id}|{app_secret}
 */
export async function debugToken(token: string): Promise<any> {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  const appAccessToken = `${appId}|${appSecret}`

  const url = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appAccessToken)}`
  const resp = await fetch(url.toString())
  const data = await resp.json()

  if (!resp.ok) {
    throw new Error(data.error?.message || 'Token debug failed')
  }
  return data.data
}

/**
 * Exchange a short-lived Facebook Page Access Token for a long-lived one (60 days).
 * 
 * GET https://graph.facebook.com/v19.0/oauth/access_token
 *   ?grant_type=fb_exchange_token
 *   &client_id={app_id}
 *   &client_secret={app_secret}
 *   &fb_exchange_token={short_lived_page_token}
 */
export async function getLongLivedPageToken(shortLivedPageToken: string): Promise<string> {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId!)
  url.searchParams.set('client_secret', appSecret!)
  url.searchParams.set('fb_exchange_token', shortLivedPageToken)

  const resp = await fetch(url.toString())
  const data = await resp.json()

  if (!resp.ok) {
    throw new Error('Page token exchange failed: ' + (data.error?.message || resp.statusText))
  }

  return data.access_token
}