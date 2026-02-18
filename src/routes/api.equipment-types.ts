import { createServerFileRoute } from '@tanstack/react-start/server'
import { exerciseQueries } from '../lib/database/index'

export const ServerRoute = createServerFileRoute('/api/equipment-types').methods({
  GET: async () => {
    try {
      const equipment = exerciseQueries.getEquipmentTypes()
      
      return new Response(JSON.stringify({
        success: true,
        data: equipment
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Equipment types fetch error:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch equipment types',
        data: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
})