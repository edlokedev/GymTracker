import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'
import { getSupabaseServerClient } from '../lib/supabase/server'

export const ServerRoute = createServerFileRoute('/api/equipment-types').methods({
  GET: async ({ request }: { request: Request }) => {
    try {
      const { supabase } = getSupabaseServerClient(request)
      const equipment = await exerciseCatalogQueries.listEquipmentTypes(supabase)

      return new Response(
        JSON.stringify({
          success: true,
          data: equipment,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      console.error('Equipment types fetch error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch equipment types',
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
