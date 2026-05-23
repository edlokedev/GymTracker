import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarDataResponse, WorkoutDetailResponse } from '@/lib/types/calendar'
import { useCalendarData } from './useCalendarData'

const calendarResponse: CalendarDataResponse = {
  success: true,
  data: {
    workouts: [
      {
        date: '2026-05-10',
        hasWorkout: true,
        workoutCount: 1,
        totalSets: 9,
        totalVolume: 3200,
        exerciseCount: 3,
        sessionIds: ['session-1'],
        intensity: 'moderate',
        duration: 45,
      },
    ],
    summary: {
      totalWorkouts: 1,
      totalVolume: 3200,
      averageWorkoutsPerWeek: 0.3,
      longestStreak: 1,
      currentStreak: 1,
      lastWorkoutDate: '2026-05-10',
      workoutsThisMonth: 1,
    },
    dateRange: {
      start: '2026-04-15T00:00:00.000Z',
      end: '2026-05-15T23:59:59.999Z',
    },
  },
}

const workoutDetailsResponse: WorkoutDetailResponse = {
  success: true,
  data: [
    {
      id: 'session-1',
      userId: 'user-1',
      date: '2026-05-10',
      duration: 45,
      notes: 'Solid',
      totalVolume: 3200,
      exerciseCount: 3,
      sets: [
        {
          id: 'set-1',
          sessionId: 'session-1',
          exerciseId: 'bench-press',
          setNumber: 1,
          reps: 8,
          weight: 100,
          exerciseName: 'Bench Press',
        },
      ],
    },
  ],
}

describe('useCalendarData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('loads calendar data through the calendar client', async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-05-15T12:00:00.000Z'),
    })
    const fetchMock = vi.fn(async () => Response.json(calendarResponse))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCalendarData('user-1'))

    await waitFor(() => expect(result.current.state.summaryStats.totalWorkouts).toBe(1))

    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(url.pathname).toBe('/api/calendar-data')
    expect(url.searchParams.get('userId')).toBe('user-1')
    expect(url.searchParams.get('start')).toBeTruthy()
    expect(url.searchParams.get('end')).toBeTruthy()
    expect(result.current.state.workoutData).toHaveLength(1)
    expect(result.current.workoutEvents).toHaveLength(1)
    expect(result.current.workoutEvents[0].title).toBe('1 workout')
  })

  it('opens the workout modal and loads details for the selected date', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.startsWith('/api/calendar-data')) {
        return Response.json(calendarResponse)
      }

      if (url.startsWith('/api/workout-details')) {
        return Response.json(workoutDetailsResponse)
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCalendarData('user-1'))

    await waitFor(() => expect(result.current.state.workoutData).toHaveLength(1))

    await act(async () => {
      result.current.actions.openWorkoutModal(new Date('2026-05-10T08:00:00.000Z'))
    })

    await waitFor(() => expect(result.current.state.selectedWorkout?.id).toBe('session-1'))

    const detailsUrl = new URL(String(fetchMock.mock.calls[1][0]), 'http://localhost')
    expect(detailsUrl.pathname).toBe('/api/workout-details')
    expect(detailsUrl.searchParams.get('userId')).toBe('user-1')
    expect(detailsUrl.searchParams.get('date')).toBe('2026-05-10')
    expect(result.current.state.isModalOpen).toBe(true)
  })
})
