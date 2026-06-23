import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error('[instagram-oauth-start] Missing config:', { hasClientId: !!clientId, hasRedirectUri: !!redirectUri })
    return NextResponse.json(
      { error: 'Instagram OAuth not configured. Check INSTAGRAM_APP_ID and INSTAGRAM_REDIRECT_URI in .env' },
      { status: 500 }
    )
  }

  // CRITICAL: These scopes are REQUIRED for the Instagram DM automation to work.
  // Without pages_show_list and business_management, we cannot get the page access token.
  // Without instagram_manage_comments, we cannot reply to comments.
  // Without instagram_manage_messages, we cannot send DMs.
  const SCOPES = [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_messaging',
    'business_management',
  ].join(',')

  // Use Facebook Login OAuth v19.0
  // auth_type=rerequest forces Meta to show the permissions dialog even if user connected before
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code` +
    `&auth_type=rerequest`

  console.log('[instagram-oauth-start] Redirecting to Facebook OAuth')
  console.log('[instagram-oauth-start] Redirect URI:', redirectUri)
  console.log('[instagram-oauth-start] Scopes:', SCOPES)

  return NextResponse.redirect(authUrl)
}