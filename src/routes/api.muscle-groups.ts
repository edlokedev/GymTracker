import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'
import { getSupabaseServerClient } from '../lib/supabase/server'

export const ServerRoute = createServerFileRoute('/api/muscle-groups').methods({
  GET: async ({ request }: { request: Request }) => {
    try {
      const { supabase } = getSupabaseServerClient(request)
      const muscleGroups = await exerciseCatalogQueries.listMuscleGroups(supabase)

      return new Response(
        JSON.stringify({
          success: true,
          data: muscleGroups,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      console.error('Muscle groups fetch error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch muscle groups',
          data: [],
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  },
})
