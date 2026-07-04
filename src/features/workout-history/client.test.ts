import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSessionWithSets } from '@/lib/types/calendar'
import type { WorkoutSession } from '@/lib/types/database'
import { workoutDetailOptions, workoutHistoryListOptions } from './client'

function lastFetchUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was not called')
  return new URL(String(call[0]), 'http://localhost')
}

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

const makeDetail = (overrides: Partial<WorkoutSessionWithSets> = {}): WorkoutSessionWithSets => ({
  id: 'session-1',
  userId: 'user-1',
  date: '2026-05-10',
  sets: [],
  totalVolume: 0,
  exerciseCount: 0,
  ...overrides,
})

describe('workout-history client queryOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('workoutHistoryListOptions requests page 1 with no userId and keys by filters', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: { data: [makeSession()], total: 1, page: 1, limit: 20, hasMore: false },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const options = workoutHistoryListOptions({ limit: 20, locationName: 'Home Gym' })
    await options.queryFn?.({} as never)

    const url = lastFetchUrl(fetchMock)
    expect(url.pathname).toBe('/api/workout-sessions')
    expect(url.searchParams.has('userId')).toBe(false)
    expect(url.searchParams.get('limit')).toBe('20')
    // Page 1 => offset 0.
    expect(url.searchParams.get('offset')).toBe('0')
    expect(url.searchParams.get('location_name')).toBe('Home Gym')

    // Filters drive the key; offset is intentionally excluded so paging never
    // splinters the cache entry.
    expect(options.queryKey).toEqual([
      'workout-sessions',
      'list',
      { limit: 20, locationName: 'Home Gym' },
    ])
    expect(workoutHistoryListOptions({ limit: 20 }).queryKey).not.toEqual(options.queryKey)
  })

  it('workoutDetailOptions keys by session id and requests the session date', async () => {
    const fetchMock = vi.fn(async () => Response.json({ success: true, data: [makeDetail()] }))
    vi.stubGlobal('fetch', fetchMock)

    const options = workoutDetailOptions(makeSession())
    expect(options.queryKey).toEqual(['workout-sessions', 'detail', 'session-1'])

    const result = await options.queryFn?.({} as never)
    const url = lastFetchUrl(fetchMock)
    expect(url.pathname).toBe('/api/workout-details')
    expect(url.searchParams.has('userId')).toBe(false)
    expect(url.searchParams.get('date')).toBe('2026-05-10')
    expect(result?.id).toBe('session-1')
  })

  it('workoutDetailOptions returns null when the requested id is absent (never another workout)', async () => {
    // The endpoint returns a DIFFERENT session for the day. The old loader fell
    // back to workouts[0] and handed back the wrong workout; the fix returns null.
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: [makeDetail({ id: 'other-session', userId: 'user-1' })],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const options = workoutDetailOptions(makeSession({ id: 'requested-session' }))
    const result = await options.queryFn?.({} as never)

    expect(result).toBeNull()
  })
})
