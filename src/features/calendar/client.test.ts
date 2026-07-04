import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarDataPayload, WorkoutSessionWithSets } from '@/lib/types/calendar'
import { calendarDataOptions, workoutDayOptions } from './client'

const emptyCalendarPayload: CalendarDataPayload = {
  workouts: [],
  summary: {
    totalWorkouts: 0,
    totalVolume: 0,
    averageWorkoutsPerWeek: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastWorkoutDate: null,
    workoutsThisMonth: 0,
  },
  dateRange: { start: '', end: '' },
}

function lastFetchUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was not called')
  return new URL(String(call[0]), 'http://localhost')
}

describe('calendar client queryOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calendarDataOptions requests local date-only window params and no userId', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ success: true, data: emptyCalendarPayload }),
    )
    vi.stubGlobal('fetch', fetchMock)

    // Local-constructed anchor so the assertion is timezone-independent.
    const options = calendarDataOptions(new Date(2026, 4, 15))
    await options.queryFn?.({} as never)

    const url = lastFetchUrl(fetchMock)
    expect(url.pathname).toBe('/api/calendar-data')
    expect(url.searchParams.has('userId')).toBe(false)
    // Date-only local calendar days, NOT UTC ISO instants (the TZ bug fix).
    expect(url.searchParams.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(url.searchParams.get('end')).toBe('2026-05-15')
    // A separate `today` is sent for summary math, decoupled from the window.
    expect(url.searchParams.get('today')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('calendarDataOptions keys distinct months distinctly', () => {
    expect(calendarDataOptions(new Date(2026, 4, 15)).queryKey).not.toEqual(
      calendarDataOptions(new Date(2026, 5, 15)).queryKey,
    )
  })

  it('workoutDayOptions requests local date-only param and no userId', async () => {
    const details: WorkoutSessionWithSets[] = []
    const fetchMock = vi.fn(async () => Response.json({ success: true, data: details }))
    vi.stubGlobal('fetch', fetchMock)

    const options = workoutDayOptions(new Date('2026-05-12T10:30:00.000Z'))
    await options.queryFn?.({} as never)

    const url = lastFetchUrl(fetchMock)
    expect(url.pathname).toBe('/api/workout-details')
    expect(url.searchParams.has('userId')).toBe(false)
    expect(url.searchParams.get('date')).toBe('2026-05-12')
  })
})
