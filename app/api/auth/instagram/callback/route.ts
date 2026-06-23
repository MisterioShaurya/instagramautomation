import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { encryptToken } from '@/lib/encryption'
import { signToken } from '@/lib/jwt'
import { createSessionCookie } from '@/lib/session-server'

/**
 * Exchange authorization code for a Facebook User Access Token
 */
async function exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  const resp = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri!,
      code,
    }),
  })

  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error('Facebook token exchange failed: ' + resp.status + ' ' + errBody)
  }

  return resp.json()
}

/**
 * Get long-lived Facebook User Access Token (60 days)
 */
async function getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID!)
  url.searchParams.set('client_secret', appSecret!)
  url.searchParams.set('fb_exchange_token', shortLivedToken)

  const resp = await fetch(url.toString())

  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error('Long-lived token exchange failed: ' + resp.status + ' ' + errBody)
  }

  return resp.json()
}

/**
 * Get Facebook Pages the user manages (to find the Instagram business account)
 */
async function getFacebookPages(accessToken: string): Promise<any[]> {
  const url = new URL('https://graph.facebook.com/v21.0/me/accounts')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', 'id,name,instagram_business_account{id,username,profile_picture_url}')

  const resp = await fetch(url.toString())
  const data = await resp.json()

  if (!resp.ok) {
    throw new Error('Failed to fetch pages: ' + (data.error?.message || resp.statusText))
  }

  return data.data || []
}

/**
 * Get a Page Access Token for the specific page
 */
async function getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/v21.0/${pageId}`)
  url.searchParams.set('access_token', userAccessToken)
  url.searchParams.set('fields', 'access_token')

  const resp = await fetch(url.toString())
  const data = await resp.json()

  if (!resp.ok) {
    throw new Error('Failed to get page token: ' + (data.error?.message || resp.statusText))
  }

  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
      console.error('[instagram-oauth] Facebook returned error:', error)
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'instagram_denied')
      return NextResponse.redirect(loginUrl)
    }

    if (!code) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_code')
      return NextResponse.redirect(loginUrl)
    }

    // Step 1: Exchange code for short-lived Facebook User Access Token
    console.log('[instagram-oauth] Exchanging code for Facebook User Token...')
    const tokenData = await exchangeCodeForToken(code)
    const shortLivedToken = tokenData.access_token
    console.log('[instagram-oauth] Got short-lived token')

    // Step 2: Exchange for long-lived Facebook User Access Token
    console.log('[instagram-oauth] Getting long-lived Facebook User Token...')
    const longLivedData = await getLongLivedToken(shortLivedToken)
    const longLivedUserToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in
    console.log('[instagram-oauth] Got long-lived token, expires in', expiresIn, 'seconds')

    // Step 3: Get Facebook Pages to find Instagram Business Account
    console.log('[instagram-oauth] Fetching Facebook Pages...')
    const pages = await getFacebookPages(longLivedUserToken)
    console.log(`[instagram-oauth] Found ${pages.length} pages`)

    if (pages.length === 0) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_pages')
      loginUrl.searchParams.set('message', 'No Facebook Pages found. You need a Facebook Page connected to an Instagram Business Account.')
      return NextResponse.redirect(loginUrl)
    }

    // Find the first page that has an Instagram business account
    const pageWithIg = pages.find((p: any) => p.instagram_business_account)
    if (!pageWithIg) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_instagram')
      loginUrl.searchParams.set('message', 'No Instagram Business Account found. Connect Instagram to your Facebook Page first.')
      return NextResponse.redirect(loginUrl)
    }

    const pageId = pageWithIg.id
    const pageName = pageWithIg.name
    const igAccount = pageWithIg.instagram_business_account
    const igUserId = igAccount.id
    const igUsername = igAccount.username || pageName
    const igProfilePic = igAccount.profile_picture_url || ''

    console.log('[instagram-oauth] Found Instagram Business Account:', { igUserId, igUsername, pageId })

    // Step 4: Get a Page Access Token (this is what we need for Instagram Graph API)
    console.log('[instagram-oauth] Getting Page Access Token...')
    const pageAccessToken = await getPageAccessToken(pageId, longLivedUserToken)
    console.log('[instagram-oauth] Got Page Access Token')

    // Step 5: Save user in database
    await connectDB()

    const existingUser = await User.findOne({ instagramUserId: igUserId })

    let userId: string

    if (existingUser) {
      const encryptedToken = encryptToken(pageAccessToken)
      existingUser.instagramAccessToken = encryptedToken
      existingUser.instagramAccessTokenEncrypted = true
      existingUser.username = igUsername
      existingUser.profilePictureUrl = igProfilePic || existingUser.profilePictureUrl
      existingUser.instagramConnected = true
      existingUser.instagramPageId = pageId
      existingUser.instagramAccountId = igUserId
      existingUser.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
      await existingUser.save()
      userId = existingUser._id.toString()
      console.log('[instagram-oauth] Updated existing user:', userId)
    } else {
      const encryptedToken = encryptToken(pageAccessToken)
      const placeholderEmail = 'ig_' + igUserId + '@placeholder.local'
      const newUser = await User.create({
        email: placeholderEmail,
        name: igUsername,
        instagramUserId: igUserId,
        username: igUsername,
        profilePictureUrl: igProfilePic,
        instagramHandle: igUsername,
        instagramConnected: true,
        instagramAccessToken: encryptedToken,
        instagramAccessTokenEncrypted: true,
        instagramPageId: pageId,
        instagramAccountId: igUserId,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      })
      userId = newUser._id.toString()
      console.log('[instagram-oauth] Created new user:', userId)
    }

    // Step 6: Create JWT session token and set cookie
    const sessionToken = signToken({
      userId,
      name: igUsername,
      instagramUserId: igUserId,
    })

    const cookieHeader = createSessionCookie(sessionToken)

    // Step 7: Redirect to dashboard
    const redirectUrl = new URL('/dashboard', request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set('Set-Cookie', cookieHeader)

    console.log('[instagram-oauth] Login successful, redirecting to dashboard')
    return response
  } catch (err) {
    console.error('[instagram-oauth] Callback error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    loginUrl.searchParams.set('message', errorMessage)
    return NextResponse.redirect(loginUrl)
  }
}