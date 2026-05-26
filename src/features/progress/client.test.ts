import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProgressData, progressFiltersToApiSearchParams } from './client'

describe('progress client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('converts filters into progress api params', () => {
    const params = progressFiltersToApiSearchParams({
      exerciseIds: ['bench', 'squat'],
      dateRange: { start: '2026-01-01', end: '2026-02-01' },
      metric: 'weight',
    })

    expect(params.has('userId')).toBe(false)
    expect(params.get('startDate')).toBe('2026-01-01')
    expect(params.get('endDate')).toBe('2026-02-01')
    expect(params.get('metric')).toBe('weight')
    expect(params.get('exercises')).toBe('bench,squat')
  })

  it('preserves progress response data shape from api', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          progress: [],
          totalExercises: 0,
          dateRange: { start: '2026-01-01', end: '2026-02-01' },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const data = await fetchProgressData({
      exerciseIds: [],
      dateRange: { start: '2026-01-01', end: '2026-02-01' },
      metric: 'volume',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress?startDate=2026-01-01&endDate=2026-02-01&metric=volume',
    )
    expect(data).toEqual({
      progress: [],
      totalExercises: 0,
      dateRange: { start: '2026-01-01', end: '2026-02-01' },
    })
  })
})
