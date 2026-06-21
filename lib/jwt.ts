import jwt from 'jsonwebtoken'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-do-not-use-in-prod'

export interface SessionPayload {
  userId: string
  email?: string
  name?: string
  instagramUserId?: string
}

/**
 * Sign a JWT session token
 */
export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' })
}

/**
 * Verify and decode a JWT session token
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload
  } catch {
    return null
  }
}