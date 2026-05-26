import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@/lib/types/database'
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
          data: {
            data: [makeSession()],
            total: 2,
            page: 1,
            limit: 1,
            hasMore: true,
          },
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

    const { result } = renderHook(() =>
      useWorkoutHistory({ userId: 'user-1', mode: 'history', limit: 1 }),
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
        return Response.json({
          success: true,
          data: makeSession({ id: 'duplicated-session' }),
        })
      }

      if (url.pathname === '/api/workout-sessions' && init?.method === 'DELETE') {
        expect(url.searchParams.get('id')).toBe('session-1')
        return Response.json({ success: true, data: { id: 'session-1' } })
      }

      if (url.pathname === '/api/workout-sessions') {
        return Response.json({
          success: true,
          data: {
            data: [makeSession()],
            total: 1,
            page: 1,
            limit: 5,
            hasMore: false,
          },
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

    const { result } = renderHook(() =>
      useWorkoutHistory({ userId: 'user-1', mode: 'recent', onDuplicated }),
    )

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))

    await act(async () => {
      await result.current.actions.openWorkoutDetails(result.current.sessions[0])
    })
    expect(result.current.selectedWorkout?.id).toBe('session-1')
    expect(result.current.isModalOpen).toBe(true)

    await act(async () => {
      await result.current.actions.duplicateSession('session-1')
    })
    expect(onDuplicated).toHaveBeenCalledWith(expect.objectContaining({ id: 'duplicated-session' }))

    await act(async () => {
      await result.current.actions.deleteSession('session-1')
    })
    expect(result.current.sessions).toEqual([])
    expect(result.current.selectedWorkout).toBeNull()
    expect(result.current.isModalOpen).toBe(false)
  })
})
