import { auth } from '../../../lib/auth/config'
import { createServerFileRoute } from '@tanstack/react-start/server'

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