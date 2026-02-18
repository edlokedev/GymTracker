import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseQueries } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/exercises/search').methods({
  GET: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const query = url.searchParams.get('query') || undefined
      const category_id = url.searchParams.get('category_id') || undefined
      const equipment = url.searchParams.get('equipment') || undefined
      const muscle_group = url.searchParams.get('muscle_group') || undefined
      const level = url.searchParams.get('level') || undefined
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const searchParams = {
        query,
        category_id,
        equipment,
        muscle_group,
        level,
        limit,
        offset
      }

      const result = exerciseQueries.search(searchParams)

      return new Response(JSON.stringify({
        success: true,
        data: result.data,
        total: result.total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit)
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Exercise search error:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to search exercises',
        data: [],
        total: 0
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
})