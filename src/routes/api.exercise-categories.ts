import { createServerFileRoute } from '@tanstack/react-start/server'
import { categoryQueries } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/exercise-categories').methods({
  GET: async () => {
    try {
      const categories = categoryQueries.getWithCounts()
      
      return new Response(JSON.stringify({
        success: true,
        data: categories
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Categories fetch error:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch categories',
        data: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
})