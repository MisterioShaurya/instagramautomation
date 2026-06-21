'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { SessionPayload } from './jwt'

interface SessionContextType {
  data: SessionPayload | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  data: null,
  status: 'loading',
  signOut: async () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data && data.userId) {
          setSession(data)
          setStatus('authenticated')
          return
        }
      }
      setSession(null)
      setStatus('unauthenticated')
    } catch {
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <SessionContext.Provider value={{ data: session, status, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}