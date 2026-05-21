// Wrap your root with <SupabaseAuthProvider> when ready to flip from Better Auth.

import type { Session, User } from '@supabase/supabase-js'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '../supabase/browser'

// Supabase-backed auth context. Coexists with the legacy Better Auth context
// in ./context.tsx. The returned hook shape mirrors `useAuth()` from
// ./context.tsx so swapping the provider at the root is mechanical:
//   - `user`           — present in both (shape differs; Supabase's User is richer)
//   - `isAuthenticated`— present in both
//   - `isLoading`      — present in both
//   - `signIn(provider?)` — present in both (Better Auth accepts any provider
//     string; Supabase's wrapper currently only handles 'google')
//   - `signOut()`      — present in both
// Additions not present in the Better Auth hook:
//   - `session`            — raw Supabase Session, useful for grabbing
//                            access_token when calling external services
//   - `signInWithGoogle()` — explicit Google sign-in, matches the planned
//                            single-provider surface

interface SupabaseAuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (provider?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

function resolveSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // SSR fallback. Real value will be supplied by VITE_SITE_URL in production.
  return ''
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = getSupabaseBrowserClient()

    // Hydrate from any persisted session in the browser cookies/local storage.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mountedRef.current) return
        setSession(data.session ?? null)
      })
      .catch((error) => {
        console.error('Supabase getSession failed:', error)
      })
      .finally(() => {
        if (!mountedRef.current) return
        setIsLoading(false)
      })

    // Keep state in sync with login/logout/refresh events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mountedRef.current) return
      setSession(next)
      setIsLoading(false)
    })

    return () => {
      mountedRef.current = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const redirectTo = `${resolveSiteUrl()}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      console.error('Supabase signInWithOAuth(google) failed:', error)
      throw error
    }
  }, [])

  const signIn = useCallback(
    async (provider: string = 'google') => {
      if (provider !== 'google') {
        throw new Error(
          `SupabaseAuthProvider.signIn: provider '${provider}' is not wired up yet. Only 'google' is supported.`,
        )
      }
      await signInWithGoogle()
    },
    [signInWithGoogle],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Supabase signOut failed:', error)
    } finally {
      if (mountedRef.current) {
        setSession(null)
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }, [])

  const value = useMemo<SupabaseAuthContextType>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: !!session?.user,
      isLoading,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [session, isLoading, signIn, signInWithGoogle, signOut],
  )

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuth() {
  const ctx = useContext(SupabaseAuthContext)
  if (ctx === undefined) {
    throw new Error('useSupabaseAuth must be used within a <SupabaseAuthProvider>')
  }
  return ctx
}

export type { SupabaseAuthContextType }
