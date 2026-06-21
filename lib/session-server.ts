import { cookies } from 'next/headers'
import { verifyToken, SessionPayload } from './jwt'

const COOKIE_NAME = 'session_token'

/**
 * Server-side session fetcher.
 * Reads the session_token cookie and verifies the JWT.
 * Use this in API routes and server components.
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const payload = verifyToken(token)
    return payload
  } catch {
    return null
  }
}

/**
 * Set the session cookie on the response
 */
export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=${maxAge}`
}

/**
 * Clear the session cookie (for sign-out)
 */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0`
}