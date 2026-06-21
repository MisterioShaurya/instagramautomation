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

  const scope = [
    'instagram_business_basic',
    'instagram_business_manage_comments',
    'instagram_business_manage_messages',
  ].join(',')

  const authUrl = new URL('https://api.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}