import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutQueries } from '../lib/database/index'
import type { WorkoutSessionInput } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/workout-sessions').methods({
  GET: async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      const result = workoutQueries.getUserSessions(userId, limit, offset)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Get user workout sessions error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to get workout sessions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
  
  POST: async ({ request }: { request: Request }) => {
    try {
      const data: WorkoutSessionInput = await request.json()
      const session = workoutQueries.createSession(data)
      
      return new Response(JSON.stringify({ success: true, data: session }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Create workout session error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create workout session' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },

  PATCH: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('id')
      const action = url.searchParams.get('action')
      
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Session ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'complete') {
        // Complete the session
        const session = workoutQueries.completeSession(sessionId)
        if (!session) {
          return new Response(
            JSON.stringify({ error: 'Session not found or already completed' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(JSON.stringify({ success: true, data: session }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        // Regular update
        const updates = await request.json()
        const session = workoutQueries.updateSession(sessionId, updates)
        if (!session) {
          return new Response(
            JSON.stringify({ error: 'Session not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(JSON.stringify({ success: true, data: session }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (error) {
      console.error('Update workout session error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update workout session' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
})