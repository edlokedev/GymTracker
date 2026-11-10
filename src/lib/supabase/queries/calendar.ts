import { assertPostgresOk, BadRequestError } from '../../api/errors'
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

const CALENDAR_SET_PAGE_SIZE = 1000
const CALENDAR_MAX_SET_PAGES = 50

function getIntensity(totalSets: number, totalVolume: number): 'light' | 'moderate' | 'intense' {
  if (totalSets >= 15 || totalVolume >= 5000) return 'intense'
  if (totalSets >= 8 || totalVolume >= 2500) return 'moderate'
  return 'light'
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

  // Pulled for streak/avg/this-month stats: a year's worth of dates, anchored to
  // the client-local `today`. Independent of the window, so it runs in parallel
  // with the window's sessions query.
  const yearStart = dayjs(today).subtract(365, 'day').format('YYYY-MM-DD')

  // 1) Sessions in the requested window (+ the year-dates query, in parallel).
  const [
    { data: sessionsData, error: sessionsError },
    { data: yearSessionsData, error: yearError },
  ] = await Promise.all([
    db
      .from<SessionRow>('workout_sessions')
      .select('id, date, start_time, end_time')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false }),
    db
      .from<{ date: string }>('workout_sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', yearStart)
      .order('date', { ascending: false }),
  ])

  assertPostgresOk(sessionsError)
  const sessions: SessionRow[] = (sessionsData ?? []) as SessionRow[]

  // 2) Sets for those sessions via `IN (...)`, paged with .range() because
  // PostgREST silently caps a response at max-rows (1000). `id` is a unique
  // tie-breaker so pages are stable.
  const sets: SetRow[] = []
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id)
    for (let page = 0; page < CALENDAR_MAX_SET_PAGES; page++) {
      const from = page * CALENDAR_SET_PAGE_SIZE
      const { data: setsData, error: setsError } = await db
        .from<SetRow>('workout_sets')
        .select('workout_id, exercise_id, weight, reps')
        .in('workout_id', sessionIds)
        .order('id', { ascending: true })
        .range(from, from + CALENDAR_SET_PAGE_SIZE - 1)
      assertPostgresOk(setsError)
      const rows = (setsData ?? []) as SetRow[]
      sets.push(...rows)
      if (rows.length < CALENDAR_SET_PAGE_SIZE) break
      if (page === CALENDAR_MAX_SET_PAGES - 1) {
        throw new BadRequestError('Too much data for this date range. Narrow the range.')
      }
    }
  }

  // Bucket sets by workout_id once to avoid repeated full scans.
  const setsByWorkoutId = new Map<string, SetRow[]>()
  for (const set of sets) {
    const bucket = setsByWorkoutId.get(set.workout_id)
    if (bucket) bucket.push(set)
    else setsByWorkoutId.set(set.workout_id, [set])
  }

  // Group sessions by calendar date and roll up totals. Distinct exercises and
  // intensity are derived from the day's accumulated totals, not per session.
  const workoutDataMap = new Map<string, WorkoutCalendarData>()
  const exercisesByDay = new Map<string, Set<string>>()
  for (const session of sessions) {
    const dateKey = formatCalendarDate(session.date)
    const sessionSets = setsByWorkoutId.get(session.id) ?? []
    const sessionVolume = sessionSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0,
    )
    const sessionDuration =
      session.end_time && session.start_time
        ? Math.round(
            (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) /
              (1000 * 60),
          )
        : undefined

    let day = workoutDataMap.get(dateKey)
    let exercises = exercisesByDay.get(dateKey)
    if (!day || !exercises) {
      exercises = new Set<string>()
      exercisesByDay.set(dateKey, exercises)
      day = {
        date: dateKey,
        hasWorkout: true,
        workoutCount: 0,
        totalSets: 0,
        totalVolume: 0,
        exerciseCount: 0,
        sessionIds: [],
        intensity: 'light',
        duration: undefined,
      }
      workoutDataMap.set(dateKey, day)
    }

    day.workoutCount += 1
    day.totalSets += sessionSets.length
    day.totalVolume += sessionVolume
    for (const set of sessionSets) exercises.add(set.exercise_id)
    day.exerciseCount = exercises.size
    day.sessionIds.push(session.id)
    if (sessionDuration !== undefined) day.duration = (day.duration ?? 0) + sessionDuration
    day.intensity = getIntensity(day.totalSets, day.totalVolume)
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
