import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { useCalendarData } from './useCalendarData'

interface CalendarApiEnvelope {
  success: true
  data: {
    workouts: Array<{
      date: string
      hasWorkout: boolean
      workoutCount: number
      totalSets: number
      totalVolume: number
      exerciseCount: number
      sessionIds: string[]
      intensity: 'light' | 'moderate' | 'intense'
      duration?: number
    }>
    summary: {
      totalWorkouts: number
      totalVolume: number
      averageWorkoutsPerWeek: number
      longestStreak: number
      currentStreak: number
      lastWorkoutDate: string | null
      workoutsThisMonth: number
    }
    dateRange: { start: string; end: string }
  }
}

function calendarEnvelope(overrides: {
  workoutDate: string
  totalWorkouts: number
}): CalendarApiEnvelope {
  return {
    success: true,
    data: {
      workouts: [
        {
          date: overrides.workoutDate,
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
        totalWorkouts: overrides.totalWorkouts,
        totalVolume: 3200,
        averageWorkoutsPerWeek: 0.3,
        longestStreak: 1,
        currentStreak: 1,
        lastWorkoutDate: overrides.workoutDate,
        workoutsThisMonth: overrides.totalWorkouts,
      },
      dateRange: { start: '', end: '' },
    },
  }
}

const workoutDetailsResponse = {
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
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-05-15T12:00:00.000Z') })
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json(calendarEnvelope({ workoutDate: '2026-05-10', totalWorkouts: 1 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCalendarData('user-1'), { wrapper })

    await waitFor(() => expect(result.current.state.summaryStats.totalWorkouts).toBe(1))

    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(url.pathname).toBe('/api/calendar-data')
    expect(url.searchParams.has('userId')).toBe(false)
    expect(url.searchParams.get('start')).toBeTruthy()
    expect(url.searchParams.get('end')).toBeTruthy()
    expect(result.current.state.workoutData).toHaveLength(1)
    expect(result.current.workoutEvents).toHaveLength(1)
    expect(result.current.workoutEvents[0].title).toBe('1 workout')
  })

  it('does not fetch when userId is empty (auth gate)', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(calendarEnvelope({ workoutDate: '2026-05-10', totalWorkouts: 1 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    renderHook(() => useCalendarData(''), { wrapper })

    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens the workout modal and loads details for the selected date', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/calendar-data')) {
        return Response.json(calendarEnvelope({ workoutDate: '2026-05-10', totalWorkouts: 1 }))
      }
      if (url.startsWith('/api/workout-details')) {
        return Response.json(workoutDetailsResponse)
      }
      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCalendarData('user-1'), { wrapper })

    await waitFor(() => expect(result.current.state.workoutData).toHaveLength(1))

    act(() => {
      result.current.actions.openWorkoutModal(new Date('2026-05-10T08:00:00.000Z'))
    })

    await waitFor(() => expect(result.current.state.selectedWorkout?.id).toBe('session-1'))

    const detailsCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).startsWith('/api/workout-details'),
    )
    const detailsUrl = new URL(String(detailsCall?.[0]), 'http://localhost')
    expect(detailsUrl.pathname).toBe('/api/workout-details')
    expect(detailsUrl.searchParams.has('userId')).toBe(false)
    expect(detailsUrl.searchParams.get('date')).toBe('2026-05-10')
    expect(result.current.state.isModalOpen).toBe(true)
  })

  it('rapid month navigation resolves to the last-requested month (race regression)', async () => {
    // Deterministic race: each request for a given month is held open until we
    // resolve it by hand. We navigate rapidly, then resolve the SUPERSEDED
    // month's request LAST. A hand-rolled loader that lets the last-arriving
    // response win would render the stale month's data; TanStack Query keys each
    // month distinctly and only reflects the query the hook currently observes,
    // so the rendered window must match the LAST month navigated to regardless
    // of resolution order.
    const resolvers = new Map<string, (payload: Response) => void>()
    const seen: string[] = []

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      const month = (url.searchParams.get('end') ?? '').slice(0, 7)
      seen.push(month)
      return new Promise<Response>((resolve) => {
        resolvers.set(month, resolve)
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const marker = (month: string) => Number(month.replace('-', '')) % 1000
    const resolveMonth = (month: string) =>
      resolvers.get(month)?.(
        Response.json(
          calendarEnvelope({ workoutDate: `${month}-10`, totalWorkouts: marker(month) }),
        ),
      )

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCalendarData('user-1'), { wrapper })

    // Wait for the initial-window request to be registered.
    await waitFor(() => expect(seen.length).toBeGreaterThan(0))
    const initialMonth = seen[0]

    // Navigate three months back — each is a NEW month, so each fires its own
    // keyed request (revisiting a cached month would not refetch).
    act(() => {
      result.current.actions.navigateMonth('prev')
    })
    await waitFor(() => expect(seen.length).toBeGreaterThan(1))
    act(() => {
      result.current.actions.navigateMonth('prev')
    })
    await waitFor(() => expect(seen.length).toBeGreaterThan(2))
    act(() => {
      result.current.actions.navigateMonth('prev')
    })
    await waitFor(() => expect(seen.length).toBeGreaterThan(3))

    const finalMonth = seen.at(-1) as string
    expect(finalMonth).not.toBe(initialMonth)

    // Resolve the FINAL month first, then the earlier (now superseded) months —
    // the stale responses arrive LAST on purpose.
    act(() => {
      resolveMonth(finalMonth)
    })
    await waitFor(() =>
      expect(result.current.state.summaryStats.totalWorkouts).toBe(marker(finalMonth)),
    )

    // Now flush the stale in-flight requests. A correct implementation must NOT
    // let these clobber the final month's rendered data.
    act(() => {
      for (const month of seen) {
        if (month !== finalMonth) resolveMonth(month)
      }
    })
    await waitFor(() => expect(result.current.state.isLoading).toBe(false))

    expect(result.current.state.summaryStats.totalWorkouts).toBe(marker(finalMonth))
    expect(result.current.state.workoutData[0]?.date.slice(0, 7)).toBe(finalMonth)
  })
})
