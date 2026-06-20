import { assertPostgresOk } from '../../api/errors'
import type { WorkoutCalendarData } from '../../types/calendar'
import {
  calculateAverageWorkoutsPerWeek,
  calculateCurrentStreak,
  calculateLongestStreak,
  dayjs,
  formatCalendarDate,
  getLocalCalendarDate,
  getWorkoutsThisMonth,
} from '../../utils/calendar'
import { type AppSupabaseClient, queryClient } from '../query-client'

// Request-scoped Supabase client (anon key + user JWT). RLS already restricts
// rows to the authenticated user; user_id filtering is added as defense in
// depth and to keep query plans tight on the (user_id, date) index.

// The calendar window + the user's actual "today", all as local `YYYY-MM-DD`
// calendar-day strings. `today` is decoupled from the window so summary math
// (streak / avg / this-month / year) stays anchored to the real current day
// even when the user navigates to a past/future window.
export type CalendarRange = {
  startDate: string
  endDate: string
  today: string
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

// Caller (the route) is responsible for validating the params as calendar dates
// and for rejecting a partial (only one of start/end) window. Here we just
// resolve: both bounds present → use them; neither → default rolling 30 days
// ending at `today`.
export function resolveCalendarRange(
  startDateParam: string | null,
  endDateParam: string | null,
  todayParam: string | null,
): CalendarRange {
  const today = todayParam ?? getLocalCalendarDate()
  if (startDateParam && endDateParam) {
    return { startDate: startDateParam, endDate: endDateParam, today }
  }
  const end = dayjs(today)
  return {
    startDate: end.subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    today,
  }
}

export async function getCalendarAggregate(
  supabase: AppSupabaseClient,
  userId: string,
  range: CalendarRange,
): Promise<CalendarAggregate> {
  const db = queryClient(supabase)
  const { startDate, endDate, today } = range

  // 1) Sessions in the requested window.
  const { data: sessionsData, error: sessionsError } = await db
    .from<SessionRow>('workout_sessions')
    .select('id, date, start_time, end_time')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  assertPostgresOk(sessionsError)
  const sessions: SessionRow[] = (sessionsData ?? []) as SessionRow[]

  // 2) Sets for those sessions, in one round-trip via `IN (...)`.
  let sets: SetRow[] = []
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id)
    const { data: setsData, error: setsError } = await db
      .from<SetRow>('workout_sets')
      .select('workout_id, exercise_id, weight, reps')
      .in('workout_id', sessionIds)
    assertPostgresOk(setsError)
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
  // Iterate calendar days as local dayjs values keyed by `YYYY-MM-DD` so the
  // keys match the session date keys exactly (no UTC drift).
  const workoutData: WorkoutCalendarData[] = []
  let cursor = dayjs(startDate)
  const endCursor = dayjs(endDate)
  while (cursor.isSame(endCursor, 'day') || cursor.isBefore(endCursor, 'day')) {
    const dateKey = cursor.format('YYYY-MM-DD')
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
    cursor = cursor.add(1, 'day')
  }

  // 3) Pull a year's worth of dates for streak/avg/this-month stats.
  // Only the `date` column is needed. Anchored to the client-local `today`.
  const yearStart = dayjs(today).subtract(365, 'day').format('YYYY-MM-DD')

  const { data: yearSessionsData, error: yearError } = await db
    .from<{ date: string }>('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .order('date', { ascending: false })
  assertPostgresOk(yearError)

  const workoutDates: string[] = (yearSessionsData ?? []).map((row: { date: string }) => row.date)

  const summary: CalendarSummary = {
    totalWorkouts: sessions.length,
    totalVolume: Array.from(workoutDataMap.values()).reduce((sum, day) => sum + day.totalVolume, 0),
    averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek(workoutDates, 4, today),
    longestStreak: calculateLongestStreak(workoutDates),
    currentStreak: calculateCurrentStreak(workoutDates, today),
    lastWorkoutDate: workoutDates.length > 0 ? workoutDates[0] : null,
    workoutsThisMonth: getWorkoutsThisMonth(workoutDates, today),
  }

  return {
    data: workoutData,
    summary,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  }
}
