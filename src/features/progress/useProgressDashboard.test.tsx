import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseProgress } from '@/lib/types/progress'
import { createQueryWrapper } from '../../../test/queryWrapper'
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
      durationSeconds: null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
      isPersonalRecord: true,
      sessionId: 'session-1',
      setNumber: 1,
    },
  ],
  personalRecords: {
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
    maxDuration: null,
    maxDistance: null,
    maxSpeed: null,
  },
  trends: {
    weight: 'stable',
    reps: 'stable',
    volume: 'stable',
    duration: 'stable',
    distance: 'stable',
    speed: 'stable',
  },
  statistics: {
    totalWorkouts: 1,
    averageWeight: 80,
    averageReps: 5,
    totalVolume: 400,
    totalDurationSeconds: 0,
    totalDistanceKm: 0,
    averageSpeedKmh: null,
    improvementPercentage: 0,
  },
}

const newerProgress: ExerciseProgress = {
  ...progress,
  exerciseId: 'squat',
  exerciseName: 'Back Squat',
  dataPoints: progress.dataPoints.map((point) => ({
    ...point,
    id: 'squat-set-1',
    date: '2026-01-10',
    exerciseId: 'squat',
    exerciseName: 'Back Squat',
    sessionId: 'squat-session-1',
  })),
}

const cardioProgress: ExerciseProgress = {
  ...newerProgress,
  exerciseId: 'run',
  exerciseName: 'Treadmill Run',
  dataPoints: newerProgress.dataPoints.map((point) => ({
    ...point,
    id: 'run-set-1',
    date: '2026-01-15',
    exerciseId: 'run',
    exerciseName: 'Treadmill Run',
    sessionId: 'run-session-1',
    weight: null,
    reps: null,
    volume: 0,
    durationSeconds: 1800,
    distanceKm: 3,
    speedKmh: 6,
  })),
}

describe('useProgressDashboard', () => {
  it('does not fetch or refresh while signed out', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useProgressDashboard({ userId: undefined }), {
      wrapper: createQueryWrapper().wrapper,
    })
    await act(async () => {
      await result.current.actions.refresh()
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.state.isLoading).toBe(false)
    expect(result.current.state.data).toEqual([])
  })

  it('ignores a slow stale response after exercise filters change', async () => {
    let resolveSlow!: (response: Response) => void
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (!String(input).includes('exercises=squat')) {
        return new Promise<Response>((resolve) => {
          resolveSlow = resolve
        })
      }
      return Promise.resolve(Response.json({ success: true, data: { progress: [newerProgress] } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useProgressDashboard({ userId: 'user-1' }), {
      wrapper: createQueryWrapper().wrapper,
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    act(() => result.current.actions.setExerciseIds(['squat']))
    await waitFor(() => expect(result.current.state.data[0]?.exerciseId).toBe('squat'))
    await act(async () => {
      resolveSlow(Response.json({ success: true, data: { progress: [progress] } }))
    })
    expect(result.current.state.data[0]?.exerciseId).toBe('squat')
    expect(result.current.state.selectedExerciseId).toBe('squat')
  })

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

    const { result } = renderHook(
      () =>
        useProgressDashboard({
          userId: 'user-1',
          initialFilters: {
            dateRange: { start: '2026-01-01', end: '2026-02-01' },
            metric: 'volume',
          },
        }),
      { wrapper: createQueryWrapper().wrapper },
    )

    await waitFor(() => expect(result.current.state.data).toHaveLength(1))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress?startDate=2026-01-01&endDate=2026-02-01&metric=volume',
    )
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

    const { result } = renderHook(
      () =>
        useProgressDashboard({
          userId: 'user-1',
          initialFilters: {
            dateRange: { start: '2026-01-01', end: '2026-02-01' },
            metric: 'volume',
          },
        }),
      { wrapper: createQueryWrapper().wrapper },
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.actions.setMetric('weight')
      result.current.actions.setExerciseIds(['bench'])
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/progress?startDate=2026-01-01&endDate=2026-02-01&metric=volume&exercises=bench',
    )
  })

  it('selects the most recently performed exercise after loading', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          progress: [progress, newerProgress],
          totalExercises: 2,
          dateRange: { start: '2026-01-01', end: '2026-02-01' },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () =>
        useProgressDashboard({
          userId: 'user-1',
          initialFilters: {
            dateRange: { start: '2026-01-01', end: '2026-02-01' },
          },
        }),
      { wrapper: createQueryWrapper().wrapper },
    )

    await waitFor(() => expect(result.current.state.data).toHaveLength(2))

    expect(result.current.state.selectedExerciseId).toBe('squat')
    expect(result.current.chartPoints[0]?.exerciseName).toBe('Back Squat')

    act(() => {
      result.current.actions.setSelectedExerciseId('bench')
    })

    expect(result.current.state.selectedExerciseId).toBe('bench')
    expect(result.current.chartPoints[0]?.exerciseName).toBe('Bench Press')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('switches to the first recorded metric when the selected exercise lacks the current one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          success: true,
          data: {
            progress: [progress, cardioProgress],
            totalExercises: 2,
            dateRange: { start: '2026-01-01', end: '2026-02-01' },
          },
        }),
      ),
    )

    const { result } = renderHook(
      () =>
        useProgressDashboard({
          userId: 'user-1',
          initialFilters: {
            dateRange: { start: '2026-01-01', end: '2026-02-01' },
            metric: 'volume',
          },
        }),
      { wrapper: createQueryWrapper().wrapper },
    )

    await waitFor(() => expect(result.current.state.selectedExerciseId).toBe('run'))

    expect(result.current.state.filters.metric).toBe('duration')
    expect(result.current.chartPoints[0]?.value).toBe(1800)
  })

  it('switches exercise tracking types without refetching display-only metrics', async () => {
    const olderCardio = {
      ...cardioProgress,
      dataPoints: cardioProgress.dataPoints.map((point) => ({
        ...point,
        date: '2025-12-15',
      })),
    }
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          progress: [progress, olderCardio],
          totalExercises: 2,
          dateRange: { start: '2025-12-01', end: '2026-02-01' },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () =>
        useProgressDashboard({
          userId: 'user-1',
          initialFilters: {
            dateRange: { start: '2025-12-01', end: '2026-02-01' },
            metric: 'volume',
          },
        }),
      { wrapper: createQueryWrapper().wrapper },
    )

    await waitFor(() => expect(result.current.state.selectedExerciseId).toBe('bench'))

    act(() => {
      result.current.actions.setSelectedExerciseId('run')
    })

    expect(result.current.state.filters.metric).toBe('duration')
    expect(result.current.chartPoints[0]?.exerciseName).toBe('Treadmill Run')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
