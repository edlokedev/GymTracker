import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@/lib/types/database'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { useWorkoutHistory } from './useWorkoutHistory'

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session-1',
  user_id: 'user-1',
  name: 'Push Day',
  date: '2026-05-10',
  start_time: '2026-05-10T10:00:00.000Z',
  created_at: new Date('2026-05-10T10:00:00.000Z'),
  updated_at: new Date('2026-05-10T10:00:00.000Z'),
  ...overrides,
})

describe('useWorkoutHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads paged history sessions and appends more', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')

      expect(url.pathname).toBe('/api/workout-sessions')
      expect(url.searchParams.has('userId')).toBe(false)
      expect(url.searchParams.get('limit')).toBe('1')

      if (url.searchParams.get('offset') === '0') {
        return Response.json({
          success: true,
          data: { data: [makeSession()], total: 2, page: 1, limit: 1, hasMore: true },
        })
      }

      if (url.searchParams.get('offset') === '1') {
        return Response.json({
          success: true,
          data: {
            data: [makeSession({ id: 'session-2', name: 'Pull Day' })],
            total: 2,
            page: 2,
            limit: 1,
            hasMore: false,
          },
        })
      }

      throw new Error(`Unexpected URL ${url.toString()}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWorkoutHistory({ userId: 'user-1', mode: 'history', limit: 1 }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    expect(result.current.hasMore).toBe(true)

    await act(async () => {
      await result.current.actions.loadMore()
    })

    expect(result.current.sessions.map((session) => session.id)).toEqual(['session-1', 'session-2'])
    expect(result.current.hasMore).toBe(false)
  })

  it('duplicates, opens details, and deletes through one hook surface', async () => {
    const onDuplicated = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')

      if (url.pathname === '/api/workout-sessions' && init?.method === 'POST') {
        expect(url.searchParams.get('action')).toBe('duplicate')
        return Response.json({ success: true, data: makeSession({ id: 'duplicated-session' }) })
      }

      if (url.pathname === '/api/workout-sessions' && init?.method === 'DELETE') {
        expect(url.searchParams.get('id')).toBe('session-1')
        return Response.json({ success: true, data: { id: 'session-1' } })
      }

      if (url.pathname === '/api/workout-sessions') {
        return Response.json({
          success: true,
          data: { data: [makeSession()], total: 1, page: 1, limit: 5, hasMore: false },
        })
      }

      if (url.pathname === '/api/workout-details') {
        expect(url.searchParams.has('userId')).toBe(false)
        expect(url.searchParams.get('date')).toBe('2026-05-10')
        return Response.json({
          success: true,
          data: [
            {
              id: 'session-1',
              userId: 'user-1',
              date: '2026-05-10',
              sets: [],
              totalVolume: 0,
              exerciseCount: 0,
            },
          ],
        })
      }

      throw new Error(`Unexpected request ${url.toString()}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWorkoutHistory({ userId: 'user-1', mode: 'recent', onDuplicated }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))

    act(() => {
      result.current.actions.openWorkoutDetails(result.current.sessions[0])
    })
    await waitFor(() => expect(result.current.selectedWorkout?.id).toBe('session-1'))
    expect(result.current.isModalOpen).toBe(true)

    let duplicated: WorkoutSession | null = null
    await act(async () => {
      duplicated = await result.current.actions.duplicateSession('session-1')
    })
    expect(duplicated).toEqual(expect.objectContaining({ id: 'duplicated-session' }))
    expect(onDuplicated).toHaveBeenCalledWith(expect.objectContaining({ id: 'duplicated-session' }))

    await act(async () => {
      await result.current.actions.deleteSession('session-1')
    })
    await waitFor(() => expect(result.current.selectedWorkout).toBeNull())
    expect(result.current.isModalOpen).toBe(false)
  })

  it('detail miss returns null, not another workout (audit fix)', async () => {
    // The day has a session, but NOT the one the caller asked for. The old loader
    // fell back to workouts[0]; the fix returns null so no wrong workout renders.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')

      if (url.pathname === '/api/workout-details') {
        return Response.json({
          success: true,
          data: [
            {
              id: 'other-session',
              userId: 'user-1',
              date: '2026-05-10',
              sets: [],
              totalVolume: 0,
              exerciseCount: 0,
            },
          ],
        })
      }

      return Response.json({
        success: true,
        data: {
          data: [makeSession({ id: 'requested-session' })],
          total: 1,
          page: 1,
          limit: 5,
          hasMore: false,
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useWorkoutHistory({ userId: 'user-1', mode: 'recent' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))

    act(() => {
      result.current.actions.openWorkoutDetails(result.current.sessions[0])
    })

    // Modal opens and loads, but resolves to null — never the 'other-session'.
    await waitFor(() => expect(result.current.isModalLoading).toBe(false))
    expect(result.current.selectedWorkout).toBeNull()
  })

  it('duplicate failures surface as duplicateError, NOT deleteError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost')

        if (url.pathname === '/api/workout-sessions' && init?.method === 'POST') {
          return Response.json(
            { success: false, error: 'Could not repeat workout' },
            { status: 500 },
          )
        }

        return Response.json({
          success: true,
          data: { data: [makeSession()], total: 1, page: 1, limit: 5, hasMore: false },
        })
      }),
    )

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useWorkoutHistory({ userId: 'user-1', mode: 'recent' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))

    let duplicated: WorkoutSession | null = makeSession()
    await act(async () => {
      duplicated = await result.current.actions.duplicateSession('session-1')
    })

    expect(duplicated).toBeNull()
    // Separated errors: the duplicate failure lives on duplicateError; the
    // delete ConfirmDialog's deleteError stays clean.
    await waitFor(() => expect(result.current.duplicateError).toBe('Could not repeat workout'))
    expect(result.current.deleteError).toBeNull()
  })

  it('rapid filter changes resolve to the last-requested filter (race regression)', async () => {
    // Deterministic race: hold each filter's request open until resolved by hand.
    // Switch filters rapidly, then resolve the SUPERSEDED filter's request LAST.
    // The old loadSessions (no request token) would render the stale filter's
    // data; TanStack Query keys each filter distinctly and only reflects the
    // query the hook currently observes.
    const resolvers = new Map<string, (r: Response) => void>()
    const seen: string[] = []

    const sessionFor = (loc: string): WorkoutSession => makeSession({ id: `s-${loc}`, name: loc })

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      const loc = url.searchParams.get('location_name') ?? '__all__'
      seen.push(loc)
      return new Promise<Response>((resolve) => {
        resolvers.set(loc, resolve)
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const resolveLoc = (loc: string) =>
      resolvers.get(loc)?.(
        Response.json({
          success: true,
          data: { data: [sessionFor(loc)], total: 1, page: 1, limit: 5, hasMore: false },
        }),
      )

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useWorkoutHistory({ userId: 'user-1', mode: 'recent' }), {
      wrapper,
    })

    await waitFor(() => expect(seen).toContain('__all__'))

    act(() => {
      result.current.actions.filterByLocation('Gym A')
    })
    await waitFor(() => expect(seen).toContain('Gym A'))
    act(() => {
      result.current.actions.filterByLocation('Gym B')
    })
    await waitFor(() => expect(seen).toContain('Gym B'))

    // Resolve the FINAL filter first, then flush the superseded ones LAST.
    act(() => {
      resolveLoc('Gym B')
    })
    await waitFor(() => expect(result.current.sessions.map((s) => s.name)).toEqual(['Gym B']))

    act(() => {
      resolveLoc('Gym A')
      resolveLoc('__all__')
    })

    // The stale responses must NOT clobber the final filter's rendered list.
    await waitFor(() => expect(result.current.sessions.map((s) => s.name)).toEqual(['Gym B']))
    expect(result.current.locationFilter).toBe('Gym B')
  })
})
