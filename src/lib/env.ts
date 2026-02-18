// Environment configuration
// This file loads environment variables for better-auth.
// All secrets must be defined in the .env file — never hardcode them here.

// In TanStack Start/Vite, environment variables are loaded automatically
// No need to manually call dotenv.config()

export const env = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./database.sqlite',
  NODE_ENV: process.env.NODE_ENV || 'development',
}

// Debug: Log environment variables (only in development)
if (env.NODE_ENV === 'development') {
  console.log('🔧 Environment Variables Loaded:')
  console.log('GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
  console.log('GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing')
  console.log('BETTER_AUTH_SECRET:', env.BETTER_AUTH_SECRET ? '✅ Set' : '❌ Missing')
}

// Validate required environment variables
const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'BETTER_AUTH_SECRET']
const missing = requiredVars.filter(key => !env[key as keyof typeof env])

if (missing.length > 0) {
  console.warn(`⚠️ Missing required environment variables: ${missing.join(', ')}`)
  console.warn('Please ensure these are set in your .env file.')
}

export default env