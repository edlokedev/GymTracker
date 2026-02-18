import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseQueries } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/muscle-groups').methods({
  GET: async () => {
    try {
      const muscleGroups = exerciseQueries.getMuscleGroups()
      
      return new Response(JSON.stringify({
        success: true,
        data: muscleGroups
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Muscle groups fetch error:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch muscle groups',
        data: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
})