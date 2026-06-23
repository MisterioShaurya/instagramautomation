import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { encryptToken } from '@/lib/encryption'
import { signToken } from '@/lib/jwt'
import { createSessionCookie } from '@/lib/session-server'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')
    const errorReason = request.nextUrl.searchParams.get('error_reason')
    const errorDescription = request.nextUrl.searchParams.get('error_description')

    if (error) {
      console.error('[instagram-oauth] Facebook returned error:', { error, errorReason, errorDescription })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'instagram_denied')
      loginUrl.searchParams.set('message', errorDescription || errorReason || error)
      return NextResponse.redirect(loginUrl)
    }

    if (!code) {
      console.error('[instagram-oauth] No code received')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_code')
      return NextResponse.redirect(loginUrl)
    }

    const appId = process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

    if (!appId || !appSecret || !redirectUri) {
      console.error('[instagram-oauth] Missing config:', { hasAppId: !!appId, hasAppSecret: !!appSecret, hasRedirectUri: !!redirectUri })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'config_error')
      return NextResponse.redirect(loginUrl)
    }

    // ============================================================
    // STEP A: Exchange code for short-lived Facebook User Access Token
    // ============================================================
    console.log('[instagram-oauth] STEP A: Exchanging code for short-lived user token...')
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`

    const tokenResp = await fetch(tokenUrl)
    const tokenData = await tokenResp.json()

    if (!tokenResp.ok) {
      const errMsg = tokenData.error?.message || tokenResp.statusText
      console.error('[instagram-oauth] STEP A failed:', errMsg, JSON.stringify(tokenData.error))
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'token_exchange_failed')
      loginUrl.searchParams.set('message', errMsg)
      return NextResponse.redirect(loginUrl)
    }

    const shortLivedUserToken = tokenData.access_token
    console.log('[instagram-oauth] STEP A: Got short-lived user token')

    // ============================================================
    // STEP B: Exchange for long-lived Facebook User Access Token (60 days)
    // ============================================================
    console.log('[instagram-oauth] STEP B: Getting long-lived user token...')
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedUserToken}`

    const longTokenResp = await fetch(longTokenUrl)
    const longTokenData = await longTokenResp.json()

    if (!longTokenResp.ok) {
      const errMsg = longTokenData.error?.message || longTokenResp.statusText
      console.error('[instagram-oauth] STEP B failed:', errMsg, JSON.stringify(longTokenData.error))
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'long_token_failed')
      loginUrl.searchParams.set('message', errMsg)
      return NextResponse.redirect(loginUrl)
    }

    const longLivedUserToken = longTokenData.access_token
    const expiresIn = longTokenData.expires_in || 5184000 // default 60 days
    console.log('[instagram-oauth] STEP B: Got long-lived user token, expires in', expiresIn, 'seconds')

    // ============================================================
    // STEP C: Get Facebook Pages list to find the page access token
    // ============================================================
    console.log('[instagram-oauth] STEP C: Fetching Facebook Pages...')
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(longLivedUserToken)}`
    const pagesResp = await fetch(pagesUrl)
    const pagesData = await pagesResp.json()

    if (!pagesResp.ok) {
      const errMsg = pagesData.error?.message || pagesResp.statusText
      console.error('[instagram-oauth] STEP C failed:', errMsg, JSON.stringify(pagesData.error))
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'pages_fetch_failed')
      loginUrl.searchParams.set('message', errMsg)
      return NextResponse.redirect(loginUrl)
    }

    const pages = pagesData.data || []
    console.log(`[instagram-oauth] STEP C: Found ${pages.length} pages`)

    if (pages.length === 0) {
      console.error('[instagram-oauth] STEP C: No pages found')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_pages')
      loginUrl.searchParams.set('message', 'No Facebook Pages found. Create a Facebook Page and connect Instagram Business Account first.')
      return NextResponse.redirect(loginUrl)
    }

    // Pick the first page (or the one with Instagram Business Account)
    const page = pages[0]
    const pageId = page.id
    const pageName = page.name
    const pageAccessToken = page.access_token

    console.log('[instagram-oauth] STEP C: Got page:', { pageId, pageName, hasPageToken: !!pageAccessToken })

    // ============================================================
    // STEP D: Get Instagram Business Account ID linked to this page
    // ============================================================
    console.log('[instagram-oauth] STEP D: Getting Instagram Business Account...')
    const pageUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`
    const pageResp = await fetch(pageUrl)
    const pageInfo = await pageResp.json()

    let instagramAccountId = ''
    let instagramUsername = ''
    let profilePictureUrl = ''

    if (pageResp.ok && pageInfo.instagram_business_account) {
      instagramAccountId = pageInfo.instagram_business_account.id
      console.log('[instagram-oauth] STEP D: Found Instagram Business Account:', instagramAccountId)

      // ============================================================
      // STEP E: Get Instagram username + profile
      // ============================================================
      console.log('[instagram-oauth] STEP E: Getting Instagram profile...')
      const igUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=id,username,profile_picture_url,followers_count&access_token=${encodeURIComponent(pageAccessToken)}`
      const igResp = await fetch(igUrl)
      const igData = await igResp.json()

      if (igResp.ok) {
        instagramUsername = igData.username || ''
        profilePictureUrl = igData.profile_picture_url || ''
        console.log('[instagram-oauth] STEP E: Got Instagram profile:', { username: instagramUsername })
      } else {
        console.warn('[instagram-oauth] STEP E failed:', igData.error?.message)
      }
    } else {
      console.warn('[instagram-oauth] STEP D: No Instagram Business Account on this page:', pageInfo.error?.message || 'not found')
      // Continue anyway - we'll still save the page token
    }

    // ============================================================
    // STEP F: Save everything to MongoDB
    // ============================================================
    console.log('[instagram-oauth] STEP F: Saving user to database...')
    await connectDB()

    const encryptedUserToken = encryptToken(longLivedUserToken)
    const encryptedPageToken = encryptToken(pageAccessToken)

    // Check if user already exists by instagramUserId or pageId
    let existingUser = null
    if (instagramAccountId) {
      existingUser = await User.findOne({ instagramAccountId })
    }
    if (!existingUser) {
      existingUser = await User.findOne({ instagramPageId: pageId })
    }

    let userId: string

    if (existingUser) {
      existingUser.instagramAccessToken = encryptedUserToken
      existingUser.pageAccessToken = encryptedPageToken
      existingUser.instagramAccessTokenEncrypted = true
      existingUser.instagramConnected = true
      existingUser.instagramPageId = pageId
      existingUser.instagramAccountId = instagramAccountId || existingUser.instagramAccountId
      existingUser.instagramUserId = instagramAccountId || existingUser.instagramUserId
      existingUser.username = instagramUsername || existingUser.username
      existingUser.instagramHandle = instagramUsername || existingUser.instagramHandle
      existingUser.profilePictureUrl = profilePictureUrl || existingUser.profilePictureUrl
      existingUser.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
      await existingUser.save()
      userId = existingUser._id.toString()
      console.log('[instagram-oauth] Updated existing user:', userId)
    } else {
      const placeholderEmail = 'ig_' + (instagramAccountId || pageId) + '@placeholder.local'
      const newUser = await User.create({
        email: placeholderEmail,
        name: instagramUsername || pageName,
        instagramUserId: instagramAccountId || pageId,
        username: instagramUsername || pageName,
        profilePictureUrl,
        instagramHandle: instagramUsername || pageName,
        instagramConnected: true,
        instagramAccessToken: encryptedUserToken,
        pageAccessToken: encryptedPageToken,
        instagramAccessTokenEncrypted: true,
        instagramPageId: pageId,
        instagramAccountId: instagramAccountId || '',
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      })
      userId = newUser._id.toString()
      console.log('[instagram-oauth] Created new user:', userId)
    }

    // Create JWT session token and set cookie
    const sessionToken = signToken({
      userId,
      name: instagramUsername || pageName,
      instagramUserId: instagramAccountId || pageId,
    })

    const cookieHeader = createSessionCookie(sessionToken)

    // Redirect to dashboard
    const redirectUrl = new URL('/dashboard', request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set('Set-Cookie', cookieHeader)

    console.log('[instagram-oauth] Login successful! Redirecting to dashboard')
    console.log('[instagram-oauth] Summary:', {
      hasPageToken: true,
      hasInstagramAccount: !!instagramAccountId,
      pageId,
      instagramAccountId,
      username: instagramUsername,
    })

    return response
  } catch (err) {
    console.error('[instagram-oauth] Fatal error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    loginUrl.searchParams.set('message', errorMessage)
    return NextResponse.redirect(loginUrl)
  }
}