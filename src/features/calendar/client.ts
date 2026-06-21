import { buildSearchParams, readApiResult } from '@/lib/api'
import type { CalendarDataResponse, WorkoutDetailResponse } from '@/lib/types/calendar'
import { formatCalendarDate, getLocalCalendarDate } from '@/lib/utils/calendar'

interface CalendarDataRequest {
  dateRange: { start: Date; end: Date }
}

export function calendarDataSearchParams({ dateRange }: CalendarDataRequest): URLSearchParams {
  // Send the window as local calendar-day strings (not UTC ISO instants) and a
  // separate `today` so summary stats anchor to the real current day even when
  // the user navigates the window.
  return buildSearchParams({
    start: getLocalCalendarDate(dateRange.start),
    end: getLocalCalendarDate(dateRange.end),
    today: getLocalCalendarDate(),
  })
}

export function workoutDetailsSearchParams(date: Date): URLSearchParams {
  return buildSearchParams({
    date: formatCalendarDate(date),
  })
}

export async function fetchCalendarData(
  request: CalendarDataRequest,
): Promise<CalendarDataResponse> {
  const params = calendarDataSearchParams(request)
  const response = await fetch(`/api/calendar-data?${params.toString()}`)

  return (await readApiResult(
    response,
    `Failed to fetch calendar data: ${response.status}`,
  )) as CalendarDataResponse
}

export async function fetchWorkoutDetails(date: Date): Promise<WorkoutDetailResponse> {
  const params = workoutDetailsSearchParams(date)
  const response = await fetch(`/api/workout-details?${params.toString()}`)

  return (await readApiResult(
    response,
    `Failed to fetch workout details: ${response.status}`,
  )) as WorkoutDetailResponse
}
