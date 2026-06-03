import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
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

    const { result } = renderHook(() =>
      useExerciseLibrary({
        initialSearch: {
          category_id: ['strength'],
          equipment: ['barbell'],
          muscle_group: ['chest'],
          query: 'bench',
        },
      }),
    )

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.equipmentTypes).toEqual(['barbell'])
    expect(result.current.muscleGroups).toEqual(['chest'])
    expect(result.current.activeFilterCount).toBe(4)
  })

  it('appends the next search page and resets filters', async () => {
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

    const { result } = renderHook(() =>
      useExerciseLibrary({
        initialSearch: {
          category_id: [],
          equipment: [],
          muscle_group: [],
          query: 'bench',
        },
      }),
    )

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))

    await act(async () => {
      await result.current.actions.loadMore()
    })
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual([
      'bench-press',
      'incline-bench',
    ])

    await act(async () => {
      await result.current.actions.resetFilters()
    })
    expect(result.current.filters.query).toBe('')
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['squat'])
  })

  it('loads quick-pick lists and toggles favorites without changing search filters', async () => {
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

    const { result } = renderHook(() =>
      useExerciseLibrary({
        initialSearch: {
          category_id: [],
          equipment: [],
          muscle_group: [],
          query: 'bench',
        },
      }),
    )

    await waitFor(() => expect(result.current.quickPickLists.favorites).toHaveLength(1))
    expect(result.current.favoriteExerciseIds).toEqual(['squat'])
    expect(result.current.favoriteExerciseIdSet.has('squat')).toBe(true)
    expect(result.current.quickPickLists.recent[0].exercise.id).toBe('bench-press')

    await act(async () => {
      await result.current.actions.loadSuggestedExercises({ exerciseId: 'bench-press', limit: 5 })
    })
    expect(result.current.quickPickLists.suggested[0]).toMatchObject({
      exercise: { id: 'push-up' },
      score: 12,
    })

    await act(async () => {
      await result.current.actions.toggleFavorite('push-up')
    })
    expect(result.current.favoriteExerciseIds).toEqual(['squat'])
    expect(result.current.filters.query).toBe('bench')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/exercise-favorites',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
