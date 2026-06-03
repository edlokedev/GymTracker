import { describe, expect, it, vi } from 'vitest'
import {
  fetchRecentExercises,
  fetchSuggestedExercises,
  filtersToApiSearchParams,
  suggestedExercisesToApiSearchParams,
  toggleFavoriteExercise,
} from './client'

describe('exercise library client', () => {
  it('converts filters into exercise search params', () => {
    const params = filtersToApiSearchParams(
      {
        categoryIds: ['strength', 'mobility'],
        equipment: ['barbell'],
        muscleGroups: ['chest'],
        query: 'bench',
      },
      { limit: 20, offset: 40 },
    )

    expect(params.getAll('category_id')).toEqual(['strength', 'mobility'])
    expect(params.getAll('equipment')).toEqual(['barbell'])
    expect(params.getAll('muscle_group')).toEqual(['chest'])
    expect(params.get('query')).toBe('bench')
    expect(params.get('limit')).toBe('20')
    expect(params.get('offset')).toBe('40')
  })

  it('converts suggested options into exercise suggestion params', () => {
    const params = suggestedExercisesToApiSearchParams({
      exerciseId: 'bench-press',
      muscle: 'chest',
      limit: 5,
    })

    expect(params.get('exerciseId')).toBe('bench-press')
    expect(params.get('muscle')).toBe('chest')
    expect(params.get('limit')).toBe('5')
  })

  it('toggles favorites with the expected route method', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init })
        return Response.json({
          success: true,
          data: { exerciseId: 'bench-press', isFavorite: init?.method === 'POST' },
        })
      }),
    )

    await expect(toggleFavoriteExercise('bench-press', false)).resolves.toEqual({
      exerciseId: 'bench-press',
      isFavorite: true,
    })
    await expect(toggleFavoriteExercise('bench-press', true)).resolves.toEqual({
      exerciseId: 'bench-press',
      isFavorite: false,
    })

    expect(requests[0]).toEqual({
      url: '/api/exercise-favorites',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: 'bench-press' }),
      },
    })
    expect(requests[1].url).toBe('/api/exercise-favorites?exerciseId=bench-press')
    expect(requests[1].init?.method).toBe('DELETE')
  })

  it('fetches recent and suggested quick-pick exercises', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input))
        return Response.json({ success: true, data: { items: [] } })
      }),
    )

    await fetchRecentExercises(6)
    await fetchSuggestedExercises({ exerciseId: 'bench-press', muscle: 'chest', limit: 4 })

    expect(urls).toEqual([
      '/api/exercises/recent?limit=6',
      '/api/exercises/suggested?exerciseId=bench-press&muscle=chest&limit=4',
    ])
  })
})
