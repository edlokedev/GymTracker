import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from './client'

// Simple user interface for OAuth
interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (provider?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      setIsLoading(true)

      // MOCK USER FOR TESTING
      setUser({
        id: 'user_2t4Y7X9ZpW8v3K1mN5nQ6jR0sL',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      /* 
      // Use Better Auth client to check session
      const session = await authClient.getSession()
      if (session.data) {
        setUser(session.data.user)
      }
      */
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (provider: string = 'google') => {
    // Use Better Auth client for sign in
    await authClient.signIn.social({
      provider: provider as any,
      callbackURL: '/' // Redirect to home after sign in
    })
  }

  const signOut = async () => {
    try {
      await authClient.signOut()
      setUser(null)
      // Optionally redirect to home
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}