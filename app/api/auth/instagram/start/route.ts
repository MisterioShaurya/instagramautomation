import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Instagram OAuth not configured' },
      { status: 500 }
    )
  }

  // Use Facebook Login OAuth which gives tokens capable of:
  // - Comment replying (private_replies API)
  // - DM sending (messaging API)
  // - Reading comments
  //
  // The following permissions are REQUIRED for the Instagram DM automation:
  // - instagram_basic: basic profile access
  // - instagram_manage_comments: reply to comments
  // - instagram_manage_messages: send DMs
  // - pages_manage_metadata: needed for Facebook Page token
  // - pages_read_engagement: read Page engagement
  // - pages_manage_messages: send messages on behalf of Page
  const scope = [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_manage_messages',
  ].join(',')

  // Use Facebook OAuth endpoint (NOT Instagram Basic Display)
  // The Instagram Graph API (v21.0) requires a Facebook User Token
  // that has been granted the Instagram permissions above.
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')

  console.log('[instagram-oauth] Starting OAuth with Facebook Login')
  console.log('[instagram-oauth] Redirect URI:', redirectUri)
  console.log('[instagram-oauth] Scopes:', scope)

  return NextResponse.redirect(authUrl.toString())
}