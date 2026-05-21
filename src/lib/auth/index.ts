// Auth surface for the React tree. Wraps the Supabase auth context and adapts
// it to the legacy `useAuth()` shape so existing call sites (Header,
// dashboards, route components) keep working without code changes.
//
// Internally:
//   - <AuthProvider> is the Supabase provider.
//   - useAuth() returns `{ user, isAuthenticated, isLoading, signIn, signOut }`
//     with `user` flattened to the old Better Auth `AuthUser` shape (id,
//     email, name, image, emailVerified, createdAt, updatedAt).
//
// If a component needs the raw Supabase Session (e.g. for an access token),
// import `useSupabaseAuth` from './supabase-context' directly instead.

import type { User as SupabaseUser } from '@supabase/supabase-js'

import { SupabaseAuthProvider, useSupabaseAuth } from './supabase-context'

export interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

interface UserMetadata {
  full_name?: string
  name?: string
  avatar_url?: string
  picture?: string
}

function adaptUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as UserMetadata
  return {
    id: user.id,
    email: user.email ?? '',
    name: meta.full_name ?? meta.name ?? undefined,
    image: meta.avatar_url ?? meta.picture ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at ?? user.created_at),
  }
}

export const AuthProvider = SupabaseAuthProvider

export function useAuth() {
  const supa = useSupabaseAuth()
  return {
    user: adaptUser(supa.user),
    isAuthenticated: supa.isAuthenticated,
    isLoading: supa.isLoading,
    signIn: supa.signIn,
    signOut: supa.signOut,
  }
}

export { useSupabaseAuth }
