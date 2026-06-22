import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { encryptToken } from '@/lib/encryption'
import { signToken } from '@/lib/jwt'
import { createSessionCookie } from '@/lib/session-server'

// Init mongoose
import('@/models/User').catch(() => {})

interface TokenExchangeResponse {
  access_token: string
  user_id: number
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InstagramProfile {
  id: string
  username: string
  account_type: string
  profile_picture_url?: string
}

/**
 * Exchange authorization code for short-lived access token
 */
async function exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  const resp = await fetch('https://api.instagram.com/oauth/access_token', {
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
    throw new Error('Token exchange failed: ' + resp.status + ' ' + errBody)
  }

  return resp.json()
}

/**
 * Exchange short-lived token for a long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  const url = new URL('https://graph.instagram.com/access_token')
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('access_token', shortLivedToken)
  url.searchParams.set('client_secret', appSecret!)

  const resp = await fetch(url.toString())

  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error('Long-lived token exchange failed: ' + resp.status + ' ' + errBody)
  }

  return resp.json()
}

/**
 * Fetch Instagram user profile (id, username, profile_picture_url)
 */
async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const url = new URL('https://graph.instagram.com/me')
  url.searchParams.set('fields', 'id,username,account_type,profile_picture_url')
  url.searchParams.set('access_token', accessToken)

  const resp = await fetch(url.toString())

  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error('Profile fetch failed: ' + resp.status + ' ' + errBody)
  }

  return resp.json()
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    // Handle Instagram error response (user denied or error)
    if (error) {
      console.error('[instagram-oauth] Instagram returned error:', error)
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'instagram_denied')
      return NextResponse.redirect(loginUrl)
    }

    if (!code) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_code')
      return NextResponse.redirect(loginUrl)
    }

    // Ensure database connection before any model operations
    await connectDB()

    // Step 1: Exchange code for short-lived token
    console.log('[instagram-oauth] Exchanging code for token...')
    const tokenData = await exchangeCodeForToken(code)
    const shortLivedToken = tokenData.access_token

    // Step 2: Exchange for long-lived token
    console.log('[instagram-oauth] Getting long-lived token...')
    const longLivedData = await getLongLivedToken(shortLivedToken)
    const longLivedToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in

    // Step 3: Fetch Instagram profile
    console.log('[instagram-oauth] Fetching profile...')
    const profile = await fetchInstagramProfile(longLivedToken)

    // Step 4: Find or create user
    const instagramUserId = profile.id
    const existingUser = await User.findOne({ instagramUserId })

    let userId: string

    if (existingUser) {
      // Update existing user's token and profile
      const encryptedToken = encryptToken(longLivedToken)
      existingUser.instagramAccessToken = encryptedToken
      existingUser.instagramAccessTokenEncrypted = true
      existingUser.username = profile.username
      existingUser.profilePictureUrl = profile.profile_picture_url || existingUser.profilePictureUrl
      existingUser.instagramConnected = true
      existingUser.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
      await existingUser.save()
      userId = existingUser._id.toString()
      console.log('[instagram-oauth] Updated existing user:', userId)
    } else {
      // Create new user
      const encryptedToken = encryptToken(longLivedToken)
      const placeholderEmail = 'ig_' + instagramUserId + '@placeholder.local'
      const newUser = await User.create({
        email: placeholderEmail,
        name: profile.username,
        instagramUserId,
        username: profile.username,
        profilePictureUrl: profile.profile_picture_url || '',
        instagramHandle: profile.username,
        instagramConnected: true,
        instagramAccessToken: encryptedToken,
        instagramAccessTokenEncrypted: true,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      })
      userId = newUser._id.toString()
      console.log('[instagram-oauth] Created new user:', userId)
    }

    // Step 5: Create JWT session token and set cookie
    const sessionToken = signToken({
      userId,
      name: profile.username,
      instagramUserId,
    })

    const cookieHeader = createSessionCookie(sessionToken)

    // Step 6: Redirect to dashboard
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