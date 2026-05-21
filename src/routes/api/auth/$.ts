// DEPRECATED — Better Auth catch-all handler.
//
// Replaced by Supabase Auth. The Supabase PKCE callback lives at
// `src/routes/auth.callback.tsx` (mounted at `/auth/callback`), and
// browser-side sign-in/out goes through `useAuth()` in `src/lib/auth/index.ts`
// which wraps `supabase.auth.signInWithOAuth` and `signOut`.
//
// This file is kept (as a stub returning 410 Gone) so the route generator
// doesn't break mid-deploy if something still pings `/api/auth/*`. Delete the
// stub once you're confident nothing on the web hits this path.

import { createServerFileRoute } from '@tanstack/react-start/server'

const gone = () =>
  new Response(
    JSON.stringify({
      error: 'Better Auth has been removed. Use Supabase Auth via /auth/callback.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    },
  )

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: gone,
  POST: gone,
})

/*
// --- Original Better Auth implementation, preserved for reference ---
import { auth } from '../../../lib/auth/config'

console.log('🔍 Auth route file loaded')
console.log('🔍 Auth handler:', typeof auth.handler)

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: async ({ request, params }) => {
    const url = new URL(request.url)
    const pathname = url.pathname
    console.log('🔍 GET request to auth route:', request.url)
    console.log('🔍 Pathname:', pathname)
    console.log('🔍 Params:', params)

    try {
      const response = await auth.handler(request)
      console.log('🔍 Auth handler response:', response)
      console.log('🔍 Response type:', typeof response)
      console.log('🔍 Response status:', response?.status)

      if (response.status === 404) {
        console.log('🔍 Better Auth returned 404 - route not recognized')
        console.log('🔍 Available auth routes should be: session, sign-in/[provider], callback/[provider], sign-out')
      }

      return response
    } catch (error) {
      console.error('🔍 Auth handler error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: 'Auth handler failed', details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  },
  POST: async ({ request, params }) => {
    const url = new URL(request.url)
    const pathname = url.pathname
    console.log('🔍 POST request to auth route:', request.url)
    console.log('🔍 Pathname:', pathname)
    console.log('🔍 Params:', params)

    try {
      const response = await auth.handler(request)
      console.log('🔍 Auth handler response:', response)
      console.log('🔍 Response type:', typeof response)
      console.log('🔍 Response status:', response?.status)
      return response
    } catch (error) {
      console.error('🔍 Auth handler error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: 'Auth handler failed', details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  },
})
*/
