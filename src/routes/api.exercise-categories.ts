import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'
import { getSupabaseServerClient } from '../lib/supabase/server'

export const ServerRoute = createServerFileRoute('/api/exercise-categories').methods({
  GET: async ({ request }: { request: Request }) => {
    try {
      const { supabase } = getSupabaseServerClient(request)
      const categories = await exerciseCatalogQueries.listCategories(supabase)

      return new Response(
        JSON.stringify({
          success: true,
          data: categories,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      console.error('Categories fetch error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch categories',
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
