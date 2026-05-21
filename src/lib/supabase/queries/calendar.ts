import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutCalendarData } from '../../types/calendar'
import {
  calculateAverageWorkoutsPerWeek,
  calculateCurrentStreak,
  calculateLongestStreak,
  formatCalendarDate,
  getRolling30DayRange,
  getWorkoutsThisMonth,
} from '../../utils/calendar'
import type { Database } from '../database.types'

// Request-scoped Supabase client (anon key + user JWT). RLS already restricts
// rows to the authenticated user; user_id filtering is added as defense in
// depth and to keep query plans tight on the (user_id, date) index.

export type CalendarDateRange = {
  start: Date
  end: Date
  startISOString: string
  endISOString: string
}

export type CalendarSummary = {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutsPerWeek: number
  longestStreak: number
  currentStreak: number
  lastWorkoutDate: string | null
  workoutsThisMonth: number
}

export type CalendarAggregate = {
  data: WorkoutCalendarData[]
  summary: CalendarSummary
  dateRange: { start: string; end: string }
}

type SessionRow = {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
}

type SetRow = {
  workout_id: string
  exercise_id: string
  weight: number | null
  reps: number | null
}

type AnyClient = SupabaseClient<Database> | SupabaseClient<any, 'public', any>

export function resolveCalendarRange(
  startDateParam: string | null,
  endDateParam: string | null,
): CalendarDateRange {
  if (startDateParam && endDateParam) {
    return {
      start: new Date(startDateParam),
      end: new Date(endDateParam),
      startISOString: startDateParam,
      endISOString: endDateParam,
    }
  }
  return getRolling30DayRange()
}

export async function getCalendarAggregate(
  supabase: AnyClient,
  userId: string,
  range: CalendarDateRange,
): Promise<CalendarAggregate> {
  const startDate = range.startISOString.split('T')[0]
  const endDate = range.endISOString.split('T')[0]

  // 1) Sessions in the requested window.
  const { data: sessionsData, error: sessionsError } = await (supabase as any)
    .from('workout_sessions')
    .select('id, date, start_time, end_time')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (sessionsError) throw sessionsError
  const sessions: SessionRow[] = (sessionsData ?? []) as SessionRow[]

  // 2) Sets for those sessions, in one round-trip via `IN (...)`.
  let sets: SetRow[] = []
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id)
    const { data: setsData, error: setsError } = await (supabase as any)
      .from('workout_sets')
      .select('workout_id, exercise_id, weight, reps')
      .in('workout_id', sessionIds)
    if (setsError) throw setsError
    sets = (setsData ?? []) as SetRow[]
  }

  // Bucket sets by workout_id once to avoid repeated full scans.
  const setsByWorkoutId = new Map<string, SetRow[]>()
  for (const set of sets) {
    const bucket = setsByWorkoutId.get(set.workout_id)
    if (bucket) bucket.push(set)
    else setsByWorkoutId.set(set.workout_id, [set])
  }

  // Group sessions by calendar date and roll up totals.
  const workoutDataMap = new Map<string, WorkoutCalendarData>()
  for (const session of sessions) {
    const dateKey = formatCalendarDate(session.date)
    const sessionSets = setsByWorkoutId.get(session.id) ?? []
    const sessionVolume = sessionSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0,
    )
    const sessionExerciseCount = new Set(sessionSets.map((s) => s.exercise_id)).size

    const existing = workoutDataMap.get(dateKey)
    if (existing) {
      existing.workoutCount += 1
      existing.totalSets += sessionSets.length
      existing.totalVolume += sessionVolume
      existing.exerciseCount += sessionExerciseCount
      existing.sessionIds.push(session.id)
    } else {
      let intensity: 'light' | 'moderate' | 'intense' = 'light'
      if (sessionSets.length >= 15 || sessionVolume >= 5000) {
        intensity = 'intense'
      } else if (sessionSets.length >= 8 || sessionVolume >= 2500) {
        intensity = 'moderate'
      }

      workoutDataMap.set(dateKey, {
        date: dateKey,
        hasWorkout: true,
        workoutCount: 1,
        totalSets: sessionSets.length,
        totalVolume: sessionVolume,
        exerciseCount: sessionExerciseCount,
        sessionIds: [session.id],
        intensity,
        duration:
          session.end_time && session.start_time
            ? Math.round(
                (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) /
                  (1000 * 60),
              )
            : undefined,
      })
    }
  }

  // Fill in days with no workout so the response covers the whole window.
  const workoutData: WorkoutCalendarData[] = []
  const cursor = new Date(range.start)
  const endCursor = new Date(range.end)
  while (cursor <= endCursor) {
    const dateKey = formatCalendarDate(cursor)
    const existing = workoutDataMap.get(dateKey)
    if (existing) {
      workoutData.push(existing)
    } else {
      workoutData.push({
        date: dateKey,
        hasWorkout: false,
        workoutCount: 0,
        totalSets: 0,
        totalVolume: 0,
        exerciseCount: 0,
        sessionIds: [],
        intensity: 'light',
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  // 3) Pull a year's worth of dates for streak/avg/this-month stats.
  // Only the `date` column is needed.
  const oneYearAgo = new Date()
  oneYearAgo.setDate(oneYearAgo.getDate() - 365)
  const yearStart = formatCalendarDate(oneYearAgo)

  const { data: yearSessionsData, error: yearError } = await (supabase as any)
    .from('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .order('date', { ascending: false })
  if (yearError) throw yearError

  const workoutDates: string[] = (yearSessionsData ?? []).map((row: { date: string }) => row.date)

  const summary: CalendarSummary = {
    totalWorkouts: sessions.length,
    totalVolume: Array.from(workoutDataMap.values()).reduce((sum, day) => sum + day.totalVolume, 0),
    averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek(workoutDates),
    longestStreak: calculateLongestStreak(workoutDates),
    currentStreak: calculateCurrentStreak(workoutDates),
    lastWorkoutDate: workoutDates.length > 0 ? workoutDates[0] : null,
    workoutsThisMonth: getWorkoutsThisMonth(workoutDates),
  }

  return {
    data: workoutData,
    summary,
    dateRange: {
      start: range.startISOString,
      end: range.endISOString,
    },
  }
}
