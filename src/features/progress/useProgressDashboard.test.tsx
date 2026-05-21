import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseProgress } from '@/lib/types/progress'
import { useProgressDashboard } from './useProgressDashboard'

const progress: ExerciseProgress = {
  exerciseId: 'bench',
  exerciseName: 'Bench Press',
  dataPoints: [
    {
      id: 'set-1',
      date: '2026-01-01',
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      weight: 80,
      reps: 5,
      volume: 400,
      isPersonalRecord: true,
      sessionId: 'session-1',
      setNumber: 1,
    },
  ],
  personalRecords: {
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
  },
  trends: {
    weight: 'stable',
    reps: 'stable',
    volume: 'stable',
  },
  statistics: {
    totalWorkouts: 1,
    averageWeight: 80,
    averageReps: 5,
    totalVolume: 400,
    improvementPercentage: 0,
  },
}

describe('useProgressDashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads progress data for current filters', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          progress: [progress],
          totalExercises: 1,
          dateRange: { start: '2026-01-01', end: '2026-02-01' },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useProgressDashboard({
        userId: 'user-1',
        initialFilters: {
          dateRange: { start: '2026-01-01', end: '2026-02-01' },
          metric: 'volume',
        },
      }),
    )

    await waitFor(() => expect(result.current.state.data).toHaveLength(1))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress?userId=user-1&startDate=2026-01-01&endDate=2026-02-01&metric=volume',
    )
    expect(result.current.summary.totalWorkouts).toBe(1)
    expect(result.current.chartPoints).toHaveLength(1)
  })

  it('wires filter controls into reloads', async () => {
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

    const { result } = renderHook(() =>
      useProgressDashboard({
        userId: 'user-1',
        initialFilters: {
          dateRange: { start: '2026-01-01', end: '2026-02-01' },
          metric: 'volume',
        },
      }),
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.actions.setMetric('weight')
      result.current.actions.setExerciseIds(['bench'])
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/progress?userId=user-1&startDate=2026-01-01&endDate=2026-02-01&metric=weight&exercises=bench',
    )
  })
})
