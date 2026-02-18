import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutQueries, workoutSetQueries } from '../lib/database/index'
import { 
  getRolling30DayRange,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateAverageWorkoutsPerWeek,
  getWorkoutsThisMonth,
  formatCalendarDate
} from '../lib/utils/calendar'
import type { CalendarDataResponse, WorkoutCalendarData } from '../lib/types/calendar'
import type { WorkoutSet } from '../lib/types/database'

export const ServerRoute = createServerFileRoute('/api/calendar-data').methods({
  GET: async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const startDateParam = url.searchParams.get('start')
    const endDateParam = url.searchParams.get('end')
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Use provided date range or default to rolling 30-day window
      let dateRange: { start: Date; end: Date; startISOString: string; endISOString: string }
      
      if (startDateParam && endDateParam) {
        dateRange = {
          start: new Date(startDateParam),
          end: new Date(endDateParam),
          startISOString: startDateParam,
          endISOString: endDateParam
        }
      } else {
        dateRange = getRolling30DayRange()
      }

      // Get workout sessions for the date range
      const sessions = workoutQueries.getSessionsByDateRange(
        userId, 
        dateRange.startISOString.split('T')[0], // Convert to YYYY-MM-DD format
        dateRange.endISOString.split('T')[0]
      )

      // Get all workout sets for sessions in this period for volume calculations
      // Since there's no getSetsBySessionIds, we'll get sets for each session individually
      const allSets: WorkoutSet[] = []
      for (const session of sessions) {
        const sessionSets = workoutSetQueries.getByWorkoutId(session.id)
        allSets.push(...sessionSets)
      }

      // Group sessions by date and calculate metrics
      const workoutDataMap = new Map<string, WorkoutCalendarData>()
      
      sessions.forEach(session => {
        const dateKey = formatCalendarDate(session.date)
        const sessionSets = allSets.filter((set: WorkoutSet) => set.workout_id === session.id)
        
        if (workoutDataMap.has(dateKey)) {
          const existing = workoutDataMap.get(dateKey)!
          existing.workoutCount += 1
          existing.totalSets += sessionSets.length
          existing.totalVolume += sessionSets.reduce((sum: number, set: WorkoutSet) => 
            sum + ((set.weight || 0) * (set.reps || 0)), 0
          )
          existing.exerciseCount += new Set(sessionSets.map((set: WorkoutSet) => set.exercise_id)).size
          existing.sessionIds.push(session.id)
        } else {
          const totalVolume = sessionSets.reduce((sum: number, set: WorkoutSet) => 
            sum + ((set.weight || 0) * (set.reps || 0)), 0
          )
          const exerciseCount = new Set(sessionSets.map((set: WorkoutSet) => set.exercise_id)).size
          
          // Determine intensity based on volume and sets
          let intensity: 'light' | 'moderate' | 'intense' = 'light'
          if (sessionSets.length >= 15 || totalVolume >= 5000) {
            intensity = 'intense'
          } else if (sessionSets.length >= 8 || totalVolume >= 2500) {
            intensity = 'moderate'
          }

          workoutDataMap.set(dateKey, {
            date: dateKey,
            hasWorkout: true,
            workoutCount: 1,
            totalSets: sessionSets.length,
            totalVolume,
            exerciseCount,
            sessionIds: [session.id],
            intensity,
            duration: session.end_time && session.start_time 
              ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))
              : undefined
          })
        }
      })

      // Fill in days without workouts
      const workoutData: WorkoutCalendarData[] = []
      const currentDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      
      while (currentDate <= endDate) {
        const dateKey = formatCalendarDate(currentDate)
        
        if (workoutDataMap.has(dateKey)) {
          workoutData.push(workoutDataMap.get(dateKey)!)
        } else {
          workoutData.push({
            date: dateKey,
            hasWorkout: false,
            workoutCount: 0,
            totalSets: 0,
            totalVolume: 0,
            exerciseCount: 0,
            sessionIds: [],
            intensity: 'light'
          })
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Calculate summary statistics
      const allUserSessions = workoutQueries.getRecentSessions(userId, 365) // Get last year of data
      const workoutDates = allUserSessions.map(s => s.date)
      
      const summary = {
        totalWorkouts: sessions.length,
        totalVolume: Array.from(workoutDataMap.values()).reduce((sum, day) => sum + day.totalVolume, 0),
        averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek(workoutDates),
        longestStreak: calculateLongestStreak(workoutDates),
        currentStreak: calculateCurrentStreak(workoutDates),
        lastWorkoutDate: workoutDates.length > 0 ? workoutDates[0] : null,
        workoutsThisMonth: getWorkoutsThisMonth(workoutDates)
      }

      const response: CalendarDataResponse = {
        success: true,
        data: workoutData,
        summary,
        dateRange: {
          start: dateRange.startISOString,
          end: dateRange.endISOString
        }
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Get calendar data error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get calendar data',
          data: [],
          summary: {
            totalWorkouts: 0,
            totalVolume: 0,
            averageWorkoutsPerWeek: 0,
            longestStreak: 0,
            currentStreak: 0,
            lastWorkoutDate: null,
            workoutsThisMonth: 0
          },
          dateRange: {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
})