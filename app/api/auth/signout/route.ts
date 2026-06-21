import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session-server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', clearSessionCookie())
  return response
}