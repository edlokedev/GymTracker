import { queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData } from '@/lib/api'
import { queryKeys } from '@/lib/api/query-keys'
import type { CalendarDataPayload, WorkoutSessionWithSets } from '@/lib/types/calendar'
import {
  formatCalendarDate,
  getLocalCalendarDate,
  getRolling30DayRange,
} from '@/lib/utils/calendar'

function calendarDataSearchParams(dateRange: { start: Date; end: Date }): URLSearchParams {
  // Send the window as local calendar-day strings (not UTC ISO instants) and a
  // separate `today` so summary stats anchor to the real current day even when
  // the user navigates the window.
  return buildSearchParams({
    start: getLocalCalendarDate(dateRange.start),
    end: getLocalCalendarDate(dateRange.end),
    today: getLocalCalendarDate(),
  })
}

/**
 * Query options for the rolling-30-day calendar window anchored on `anchorDate`.
 * The key is the exact start/end day strings the request sends, so any two
 * different windows get distinct cache entries — TanStack Query then guarantees last-request-wins,
 * retiring the hand-rolled stale-response race in the old useCalendarData.
 */
export function calendarDataOptions(anchorDate: Date) {
  const dateRange = getRolling30DayRange(anchorDate)
  const start = getLocalCalendarDate(dateRange.start)
  const end = getLocalCalendarDate(dateRange.end)

  return queryOptions({
    queryKey: queryKeys.calendar.data(start, end),
    queryFn: async () => {
      const params = calendarDataSearchParams(dateRange)
      const response = await fetch(`/api/calendar-data?${params.toString()}`)
      return readApiData<CalendarDataPayload>(
        response,
        `Failed to fetch calendar data: ${response.status}`,
      )
    },
  })
}

/**
 * Query options for a single day's workout sessions (the WorkoutDetailModal
 * drill-down). Keyed by the local calendar-day string.
 */
export function workoutDayOptions(date: Date) {
  const dateKey = formatCalendarDate(date)

  return queryOptions({
    queryKey: queryKeys.calendar.day(dateKey),
    queryFn: async () => {
      const params = buildSearchParams({ date: dateKey })
      const response = await fetch(`/api/workout-details?${params.toString()}`)
      return readApiData<WorkoutSessionWithSets[]>(
        response,
        `Failed to fetch workout details: ${response.status}`,
        { fallbackData: [] },
      )
    },
  })
}
