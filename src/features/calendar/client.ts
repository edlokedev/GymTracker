import { buildSearchParams, readApiResult } from '@/lib/api'
import type { CalendarDataResponse, WorkoutDetailResponse } from '@/lib/types/calendar'
import { formatCalendarDate } from '@/lib/utils/calendar'

interface CalendarDataRequest {
  dateRange: { start: Date; end: Date }
}

export function calendarDataSearchParams({ dateRange }: CalendarDataRequest): URLSearchParams {
  return buildSearchParams({
    start: dateRange.start.toISOString(),
    end: dateRange.end.toISOString(),
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
