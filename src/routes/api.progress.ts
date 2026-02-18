import { createServerFileRoute } from '@tanstack/react-start/server'
import { getProgressQueries } from '../lib/database/queries'
import { db } from '../lib/database/db'
import type { ProgressRequest, ProgressResponse } from '../lib/types/progress'
import dayjs from 'dayjs'

export const ServerRoute = createServerFileRoute('/api/progress').methods({
  GET: async ({ request }: { request: Request }) => {
    try {
      const url = new URL(request.url)
      const searchParams = url.searchParams

      // Parse query parameters
      const userId = searchParams.get('userId')
      const exerciseIds = searchParams.get('exercises')?.split(',').filter(Boolean) || []
      const startDate = searchParams.get('startDate') || dayjs().subtract(90, 'day').format('YYYY-MM-DD')
      const endDate = searchParams.get('endDate') || dayjs().format('YYYY-MM-DD')
      const metric = searchParams.get('metric') as 'weight' | 'reps' | 'volume' || 'volume'
      const limit = parseInt(searchParams.get('limit') || '1000')

      // Validate required parameters
      if (!userId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'userId is required' 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate date range
      if (dayjs(startDate).isAfter(dayjs(endDate))) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Start date cannot be after end date' 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      // Build progress request
      const progressRequest: ProgressRequest = {
        userId,
        exerciseIds: exerciseIds.length > 0 ? exerciseIds : undefined,
        startDate,
        endDate,
        metric,
        limit
      }

      // Get progress data
      const progressQueries = getProgressQueries(db)
      const progressData = progressQueries.getProgressData(progressRequest)

      const response: ProgressResponse = {
        success: true,
        data: {
          progress: progressData,
          totalExercises: progressData.length,
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error: any) {
      console.error('Progress API error:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch progress data',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
})