import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000', // Base URL of your app
})

// Export specific methods for convenience
export const { 
  signIn, 
  signOut, 
  signUp, 
  useSession 
} = authClient