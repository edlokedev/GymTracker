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
      if (url.startsWith('/api/exercises/search')) {
        expect(url).toContain('category_id=strength')
        expect(url).toContain('equipment=barbell')
        expect(url).toContain('muscle_group=chest')
        expect(url).toContain('query=bench')
        return Response.json({
          data: [makeExercise('bench-press', 'Bench Press')],
          total: 1,
          page: 1,
          totalPages: 1,
          hasMore: false,
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

      const searchUrl = new URL(url, 'http://localhost')
      const offset = searchUrl.searchParams.get('offset')
      const query = searchUrl.searchParams.get('query')

      if (offset === '0' && query === 'bench') {
        return Response.json({
          data: [makeExercise('bench-press', 'Bench Press')],
          total: 2,
          page: 1,
          totalPages: 2,
          hasMore: true,
        })
      }

      if (offset === '1' && query === 'bench') {
        return Response.json({
          data: [makeExercise('incline-bench', 'Incline Bench Press')],
          total: 2,
          page: 2,
          totalPages: 2,
          hasMore: false,
        })
      }

      if (offset === '0' && !query) {
        return Response.json({
          data: [makeExercise('squat', 'Squat')],
          total: 1,
          page: 1,
          totalPages: 1,
          hasMore: false,
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
})
