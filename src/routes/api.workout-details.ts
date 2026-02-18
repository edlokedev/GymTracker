import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutQueries } from '../lib/database/index'
import type { WorkoutDetailResponse } from '../lib/types/calendar'

export const ServerRoute = createServerFileRoute('/api/workout-details').methods({
  GET: async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const date = url.searchParams.get('date')
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!date) {
      return new Response(
        JSON.stringify({ success: false, error: 'date is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Get all workout sessions for the specified date
      const sessions = workoutQueries.getSessionsByDateRange(userId, date, date)
      
      // Get detailed session information including sets for each session
      const detailedSessions = sessions.map(session => {
        const sessionWithSets = workoutQueries.getSessionWithSets(session.id)
        
        if (!sessionWithSets) {
          return {
            id: session.id,
            userId: session.user_id,
            date: session.date,
            duration: session.end_time && session.start_time 
              ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))
              : undefined,
            notes: session.notes,
            sets: [],
            totalVolume: 0,
            exerciseCount: 0
          }
        }

        return {
          id: sessionWithSets.id,
          userId: sessionWithSets.user_id,
          date: sessionWithSets.date,
          duration: sessionWithSets.end_time && sessionWithSets.start_time 
            ? Math.round((new Date(sessionWithSets.end_time).getTime() - new Date(sessionWithSets.start_time).getTime()) / (1000 * 60))
            : undefined,
          notes: sessionWithSets.notes,
          sets: sessionWithSets.sets.map(set => ({
            id: set.id,
            sessionId: set.workout_id,
            exerciseId: set.exercise_id,
            setNumber: set.set_number,
            reps: set.reps || 0,
            weight: set.weight || 0,
            restTime: set.rest_time,
            notes: set.notes,
            exerciseName: undefined // Will be populated if needed
          })),
          totalVolume: sessionWithSets.total_volume || 0,
          exerciseCount: new Set(sessionWithSets.sets.map(set => set.exercise_id)).size
        }
      })

      const response: WorkoutDetailResponse = {
        success: true,
        data: detailedSessions
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Get workout details error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get workout details',
          data: []
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
})