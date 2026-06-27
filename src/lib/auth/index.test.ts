import type { User as SupabaseUser } from '@supabase/supabase-js'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mutable handle to whatever our mocked Supabase context should return for
// `user`. vi.hoisted runs before the vi.mock factory below, so the factory can
// safely close over it (vitest hoists vi.mock calls above the imports).
const supa = vi.hoisted(() => ({
  current: null as SupabaseUser | null,
}))

vi.mock('./supabase-context', () => ({
  // index.ts re-exports this as AuthProvider; a passthrough stub is enough here.
  SupabaseAuthProvider: ({ children }: { children: unknown }) => children,
  // useAuth() wraps this hook. We return the *same* `supa.current` reference on
  // every render, mirroring the real provider, which only swaps `user` on an
  // actual auth state change. The wrapper object is intentionally new each call
  // (like the real one) to prove that only `user` identity needs to be stable.
  useSupabaseAuth: () => ({
    user: supa.current,
    session: null,
    isAuthenticated: Boolean(supa.current),
    isLoading: false,
    signIn: async () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
  }),
}))

import { useAuth } from './index'

// Minimal Supabase user; only the fields adaptUser() reads need to be present.
function makeSupabaseUser(id: string): SupabaseUser {
  return {
    id,
    email: `${id}@example.com`,
    user_metadata: { full_name: 'Test User' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  } as SupabaseUser
}

describe('useAuth', () => {
  it('returns a referentially stable user across re-renders when the supabase user is unchanged', () => {
    supa.current = makeSupabaseUser('user-1')
    const { result, rerender } = renderHook(() => useAuth())

    const first = result.current.user
    rerender()
    const second = result.current.user

    // Regression guard: adaptUser() used to run on every render and return a
    // fresh object, so first !== second. That unstable identity made consumer
    // effect/callback deps keyed on `user` fire every render, which drove an
    // infinite refetch loop against /api/exercises/custom (~280k Vercel
    // function calls/day). The adapted user must keep a stable reference while
    // the underlying Supabase user is unchanged.
    expect(second).toBe(first)
    expect(first?.id).toBe('user-1')
  })

  it('returns a new user object when the underlying supabase user changes', () => {
    supa.current = makeSupabaseUser('user-1')
    const { result, rerender } = renderHook(() => useAuth())
    const first = result.current.user

    supa.current = makeSupabaseUser('user-2')
    rerender()

    expect(result.current.user).not.toBe(first)
    expect(result.current.user?.id).toBe('user-2')
  })

  it('returns a null user when signed out', () => {
    supa.current = null
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })
})
