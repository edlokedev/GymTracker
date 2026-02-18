import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutSetQueries } from '../lib/database/index'
import type { WorkoutSetInput } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/workout-sets').methods({
  POST: async ({ request }: { request: Request }) => {
    try {
      const data: WorkoutSetInput = await request.json()
      
      // Validate required fields
      if (!data.workout_id || !data.exercise_id || !data.set_order) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: workout_id, exercise_id, and set_order are required' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const workoutSet = workoutSetQueries.createSet(data)
      
      return new Response(JSON.stringify({ success: true, data: workoutSet }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error: any) {
      console.error('Create workout set error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create workout set', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },

  PUT: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const setId = url.searchParams.get('id')
      
      if (!setId) {
        return new Response(
          JSON.stringify({ error: 'Set ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data: Partial<WorkoutSetInput> = await request.json()
      const updatedSet = workoutSetQueries.updateSet(setId, data)
      
      if (!updatedSet) {
        return new Response(
          JSON.stringify({ error: 'Workout set not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(JSON.stringify({ success: true, data: updatedSet }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error: any) {
      console.error('Update workout set error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update workout set', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },

  DELETE: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const setId = url.searchParams.get('id')
      
      if (!setId) {
        return new Response(
          JSON.stringify({ error: 'Set ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const success = workoutSetQueries.deleteSet(setId)
      
      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Workout set not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error: any) {
      console.error('Delete workout set error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to delete workout set', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },

  GET: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const workoutId = url.searchParams.get('workoutId')
      const setId = url.searchParams.get('id')
      
      if (setId) {
        // Get specific set
        const workoutSet = workoutSetQueries.getSet(setId)
        if (!workoutSet) {
          return new Response(
            JSON.stringify({ error: 'Workout set not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(JSON.stringify({ success: true, data: workoutSet }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else if (workoutId) {
        // Get all sets for a workout
        const sets = workoutSetQueries.getByWorkoutId(workoutId)
        return new Response(JSON.stringify({ success: true, data: sets }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(
          JSON.stringify({ error: 'Either workoutId or id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (error: any) {
      console.error('Get workout sets error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to get workout sets', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
})