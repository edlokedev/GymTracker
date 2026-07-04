import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { useExerciseLibrary } from './useExerciseLibrary'

const makeExercise = (id: string, name: string): ExerciseWithParsedFields => ({
  id,
  name,
  category_id: 'strength',
  category_name: 'Strength',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  gif_path: null,
  preview_image_path: null,
  created_at: new Date(),
  updated_at: new Date(),
})

// renderHook helper that provides a fresh QueryClient (ADR-0007, Phase 3). The
// hook is now a façade over four query-backed hooks, so every test wraps it.
function renderLibrary(options: Parameters<typeof useExerciseLibrary>[0]) {
  const { wrapper, queryClient } = createQueryWrapper()
  const rendered = renderHook(() => useExerciseLibrary(options), { wrapper })
  return { ...rendered, queryClient }
}

describe('useExerciseLibrary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads facets and searches from initial filters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercise-categories') {
        return Response.json({
          data: [{ id: 'strength', name: 'Strength', exercise_count: 1 }],
        })
      }
      if (url === '/api/equipment-types') {
        return Response.json({ data: ['barbell'] })
      }
      if (url === '/api/muscle-groups') {
        return Response.json({ data: ['chest'] })
      }
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: { items: [], exerciseIds: [] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/search')) {
        expect(url).toContain('category_id=strength')
        expect(url).toContain('equipment=barbell')
        expect(url).toContain('muscle_group=chest')
        expect(url).toContain('query=bench')
        return Response.json({
          success: true,
          data: {
            items: [makeExercise('bench-press', 'Bench Press')],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: ['strength'],
        equipment: ['barbell'],
        muscle_group: ['chest'],
        query: 'bench',
      },
    })

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.equipmentTypes).toEqual(['barbell'])
    expect(result.current.muscleGroups).toEqual(['chest'])
    expect(result.current.activeFilterCount).toBe(4)
  })

  it('appends the next infinite-search page and resets filters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercise-categories') return Response.json({ data: [] })
      if (url === '/api/equipment-types') return Response.json({ data: [] })
      if (url === '/api/muscle-groups') return Response.json({ data: [] })
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: { items: [], exerciseIds: [] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }

      const searchUrl = new URL(url, 'http://localhost')
      const offset = searchUrl.searchParams.get('offset')
      const query = searchUrl.searchParams.get('query')

      if (offset === '0' && query === 'bench') {
        return Response.json({
          success: true,
          data: {
            items: [makeExercise('bench-press', 'Bench Press')],
            total: 2,
            page: 1,
            totalPages: 2,
            hasMore: true,
          },
        })
      }

      if (offset === '1' && query === 'bench') {
        return Response.json({
          success: true,
          data: {
            items: [makeExercise('incline-bench', 'Incline Bench Press')],
            total: 2,
            page: 2,
            totalPages: 2,
            hasMore: false,
          },
        })
      }

      if (offset === '0' && !query) {
        return Response.json({
          success: true,
          data: {
            items: [makeExercise('squat', 'Squat')],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      }

      throw new Error(`Unexpected search: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: [],
        equipment: [],
        muscle_group: [],
        query: 'bench',
      },
    })

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))
    expect(result.current.hasMore).toBe(true)

    // Infinite pagination: the second page is fetched at offset = sum of prior
    // page lengths and merged after the first — Query owns the page-merge.
    await act(async () => {
      await result.current.actions.loadMore()
    })
    await waitFor(() =>
      expect(result.current.exercises.map((exercise) => exercise.id)).toEqual([
        'bench-press',
        'incline-bench',
      ]),
    )
    expect(result.current.hasMore).toBe(false)

    await act(async () => {
      await result.current.actions.resetFilters()
    })
    await waitFor(() =>
      expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['squat']),
    )
    expect(result.current.filters.query).toBe('')
  })

  it('shows favourite exercises when the favourites filter is active, without hitting search', async () => {
    const benchPress = makeExercise('bench-press', 'Bench Press')
    const squat = makeExercise('squat', 'Squat')
    const pushUp = makeExercise('push-up', 'Push-Up')
    const searchCalls: string[] = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercise-categories') return Response.json({ data: [] })
      if (url === '/api/equipment-types') return Response.json({ data: [] })
      if (url === '/api/muscle-groups') return Response.json({ data: [] })
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: { items: [squat, pushUp], exerciseIds: ['squat', 'push-up'] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/search')) {
        searchCalls.push(url)
        return Response.json({
          success: true,
          data: {
            items: [benchPress],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: [],
        equipment: [],
        muscle_group: [],
        query: '',
      },
    })

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))
    await waitFor(() => expect(result.current.favoriteExercises).toHaveLength(2))

    const searchCallsBeforeToggle = searchCalls.length

    await act(async () => {
      await result.current.actions.toggleFavouritesFilter()
    })

    await waitFor(() => expect(result.current.filters.favourites).toBe(true))
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['squat', 'push-up'])
    expect(result.current.total).toBe(2)
    expect(result.current.hasMore).toBe(false)
    // Favourites is a pure client-side filter (ADR-0005) — it must not hit search.
    expect(searchCalls.length).toBe(searchCallsBeforeToggle)

    await act(async () => {
      await result.current.actions.toggleFavouritesFilter()
    })

    await waitFor(() => expect(result.current.filters.favourites).toBe(false))
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['bench-press'])
  })

  it('optimistically flips a favourite toggle and refreshes the favourites-only list', async () => {
    const squat = makeExercise('squat', 'Squat')
    const pushUp = makeExercise('push-up', 'Push-Up')
    const benchPress = makeExercise('bench-press', 'Bench Press')
    let squatRemoved = false

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/exercise-categories') return Response.json({ data: [] })
      if (url === '/api/equipment-types') return Response.json({ data: [] })
      if (url === '/api/muscle-groups') return Response.json({ data: [] })
      if (url.startsWith('/api/exercise-favorites') && init?.method === 'DELETE') {
        squatRemoved = true
        return Response.json({
          success: true,
          data: { exerciseId: 'squat', isFavorite: false },
        })
      }
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: squatRemoved
            ? { items: [pushUp], exerciseIds: ['push-up'] }
            : { items: [squat, pushUp], exerciseIds: ['squat', 'push-up'] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/search')) {
        return Response.json({
          success: true,
          data: {
            items: [benchPress],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: [],
        equipment: [],
        muscle_group: [],
        query: '',
      },
    })

    await waitFor(() => expect(result.current.favoriteExercises).toHaveLength(2))

    await act(async () => {
      await result.current.actions.toggleFavouritesFilter()
    })
    await waitFor(() =>
      expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['squat', 'push-up']),
    )

    // Removing a favourite while the favourites view is active updates the
    // rendered list (optimistic onMutate + onSettled refetch), not just state.
    await act(async () => {
      await result.current.actions.toggleFavorite('squat')
    })

    await waitFor(() =>
      expect(result.current.favoriteExercises.map((exercise) => exercise.id)).toEqual(['push-up']),
    )
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['push-up'])
    expect(result.current.total).toBe(1)
  })

  it('optimistically drops the favourite then rolls back to its snapshot on error', async () => {
    const squat = makeExercise('squat', 'Squat')
    const pushUp = makeExercise('push-up', 'Push-Up')

    // Gate the failing DELETE so the test can observe the optimistic
    // intermediate state (squat already dropped) *before* the mutation settles,
    // then release it to reject and assert the rollback restores squat.
    let releaseDelete: () => void = () => {}
    const deleteGate = new Promise<void>((resolve) => {
      releaseDelete = resolve
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/exercise-categories') return Response.json({ data: [] })
      if (url === '/api/equipment-types') return Response.json({ data: [] })
      if (url === '/api/muscle-groups') return Response.json({ data: [] })
      if (url.startsWith('/api/exercise-favorites') && init?.method === 'DELETE') {
        await deleteGate
        return new Response('nope', { status: 500 })
      }
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: { items: [squat, pushUp], exerciseIds: ['squat', 'push-up'] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/search')) {
        return Response.json({
          success: true,
          data: { items: [], total: 0, page: 1, totalPages: 1, hasMore: false },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: [],
        equipment: [],
        muscle_group: [],
        query: '',
      },
    })

    await waitFor(() => expect(result.current.favoriteExercises).toHaveLength(2))
    expect(result.current.favoriteExerciseIds).toEqual(['squat', 'push-up'])

    // Fire the toggle but don't await it — the DELETE is gated open.
    let togglePromise: Promise<unknown> = Promise.resolve()
    act(() => {
      togglePromise = result.current.actions.toggleFavorite('squat').catch(() => {})
    })

    // Optimistic flip: squat is dropped from the cache immediately, before the
    // server responds.
    await waitFor(() => expect(result.current.favoriteExerciseIds).toEqual(['push-up']))

    // Release the DELETE → it rejects → onError rolls back to the snapshot and
    // onSettled re-reads the server list. Either path restores squat; together
    // they guarantee a failed toggle never leaves a phantom removal.
    await act(async () => {
      releaseDelete()
      await togglePromise
    })

    await waitFor(() => expect(result.current.togglingFavoriteId).toBeNull())
    expect(result.current.favoriteExerciseIds).toEqual(['squat', 'push-up'])
  })

  it('loads quick-pick lists and toggles a favourite without changing search filters', async () => {
    const benchPress = makeExercise('bench-press', 'Bench Press')
    const squat = makeExercise('squat', 'Squat')
    const pushUp = makeExercise('push-up', 'Push-Up')

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/exercise-categories') return Response.json({ data: [] })
      if (url === '/api/equipment-types') return Response.json({ data: [] })
      if (url === '/api/muscle-groups') return Response.json({ data: [] })
      if (url.startsWith('/api/exercises/search')) {
        return Response.json({
          success: true,
          data: {
            items: [benchPress],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      }
      if (url === '/api/exercise-favorites' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ exerciseId: 'push-up' })
        return Response.json({
          success: true,
          data: { exerciseId: 'push-up', isFavorite: true },
        })
      }
      if (url === '/api/exercise-favorites') {
        return Response.json({
          success: true,
          data: { items: [squat], exerciseIds: ['squat'] },
        })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({
          success: true,
          data: {
            items: [{ exercise: benchPress, lastUsedAt: '2026-06-01T00:00:00.000Z', useCount: 2 }],
          },
        })
      }
      if (url.startsWith('/api/exercises/suggested')) {
        expect(url).toContain('exerciseId=bench-press')
        return Response.json({
          success: true,
          data: {
            items: [{ exercise: pushUp, score: 12, reasons: ['same primary muscle'] }],
          },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderLibrary({
      initialSearch: {
        category_id: [],
        equipment: [],
        muscle_group: [],
        query: 'bench',
      },
    })

    await waitFor(() => expect(result.current.quickPickLists.favorites).toHaveLength(1))
    expect(result.current.favoriteExerciseIds).toEqual(['squat'])
    expect(result.current.favoriteExerciseIdSet.has('squat')).toBe(true)
    expect(result.current.quickPickLists.recent[0].exercise.id).toBe('bench-press')

    await act(async () => {
      await result.current.actions.loadSuggestedExercises({ exerciseId: 'bench-press', limit: 5 })
    })
    await waitFor(() =>
      expect(result.current.quickPickLists.suggested[0]).toMatchObject({
        exercise: { id: 'push-up' },
        score: 12,
      }),
    )

    await act(async () => {
      await result.current.actions.toggleFavorite('push-up')
    })
    expect(result.current.filters.query).toBe('bench')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/exercise-favorites',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
