import CryptoJS from 'crypto-js'

/**
 * Encryption utilities for securing sensitive data like Instagram access tokens
 * This prevents storing plaintext tokens in the database
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  ENCRYPTION_KEY not set - tokens will be stored unencrypted in production!')
}

/**
 * Encrypt a string (e.g., Instagram access token)
 * Uses AES encryption with the ENCRYPTION_KEY environment variable
 */
export function encryptToken(token: string): string {
  if (!token) return ''

  if (!ENCRYPTION_KEY) {
    console.warn(
      '[encryption] No ENCRYPTION_KEY available - returning token unencrypted (dev mode)'
    )
    return token
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
    return encrypted
  } catch (error) {
    console.error('[encryption] Encryption failed:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt a previously encrypted string
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return ''

  if (!ENCRYPTION_KEY) {
    console.warn('[encryption] No ENCRYPTION_KEY - assuming token is plaintext (dev mode)')
    return encryptedToken
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8
    )
    return decrypted
  } catch (error) {
    console.error('[encryption] Decryption failed:', error)
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Generate a simple verification token for webhook security
 * Used as a fallback if the user hasn't configured their own
 */
export function generateWebhookSecret(): string {
  const randomBytes = CryptoJS.lib.WordArray.random(32)
  return randomBytes.toString(CryptoJS.enc.Hex)
}
