import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProgressFilters, ProgressState } from '@/lib/types/progress'
import { fetchProgressData } from './client'
import {
  applyProgressDatePreset,
  buildProgressChartPoints,
  createProgressState,
  findMostRecentExerciseId,
  getAvailableProgressMetrics,
  type ProgressDatePresetValue,
} from './model'

interface UseProgressDashboardOptions {
  userId?: string
  initialFilters?: Partial<ProgressFilters>
}

export function useProgressDashboard({ userId, initialFilters }: UseProgressDashboardOptions) {
  const [state, setState] = useState<ProgressState>(() => {
    const initialState = createProgressState()

    return {
      ...initialState,
      filters: {
        ...initialState.filters,
        ...initialFilters,
        dateRange: initialFilters?.dateRange || initialState.filters.dateRange,
        exerciseIds: initialFilters?.exerciseIds || initialState.filters.exerciseIds,
      },
    }
  })
  const dataFilters = useMemo<ProgressFilters>(
    () => ({
      exerciseIds: state.filters.exerciseIds,
      dateRange: state.filters.dateRange,
      metric: 'volume',
    }),
    [state.filters.exerciseIds, state.filters.dateRange],
  )

  const loadProgressData = useCallback(async () => {
    if (!userId) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await fetchProgressData(dataFilters)
      setState((prev) => {
        const selectedExerciseId = data.progress.some(
          (exercise) => exercise.exerciseId === prev.selectedExerciseId,
        )
          ? prev.selectedExerciseId
          : findMostRecentExerciseId(data.progress)
        const selectedExercise = data.progress.find(
          (exercise) => exercise.exerciseId === selectedExerciseId,
        )
        const availableMetrics = selectedExercise
          ? getAvailableProgressMetrics(selectedExercise)
          : []
        const metric = availableMetrics.includes(prev.filters.metric)
          ? prev.filters.metric
          : (availableMetrics[0] ?? prev.filters.metric)

        return {
          ...prev,
          data: data.progress,
          selectedExerciseId,
          filters: metric === prev.filters.metric ? prev.filters : { ...prev.filters, metric },
          isLoading: false,
          error: null,
        }
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch progress data',
      }))
    }
  }, [dataFilters, userId])

  useEffect(() => {
    void loadProgressData()
  }, [loadProgressData])

  const setFilters = useCallback((filters: Partial<ProgressFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters,
        dateRange: filters.dateRange || prev.filters.dateRange,
        exerciseIds: filters.exerciseIds || prev.filters.exerciseIds,
      },
    }))
  }, [])

  const actions = {
    setMetric: useCallback((metric: ProgressFilters['metric']) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, metric },
      }))
    }, []),

    setDatePreset: useCallback((presetValue: ProgressDatePresetValue) => {
      setState((prev) => ({
        ...prev,
        filters: applyProgressDatePreset(prev.filters, presetValue),
      }))
    }, []),

    setDateRange: useCallback((dateRange: ProgressFilters['dateRange']) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, dateRange },
      }))
    }, []),

    setExerciseIds: useCallback((exerciseIds: string[]) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, exerciseIds },
      }))
    }, []),

    setSelectedExerciseId: useCallback((selectedExerciseId: string) => {
      setState((prev) => {
        const selectedExercise = prev.data.find(
          (exercise) => exercise.exerciseId === selectedExerciseId,
        )
        const availableMetrics = selectedExercise
          ? getAvailableProgressMetrics(selectedExercise)
          : []
        const metric = availableMetrics.includes(prev.filters.metric)
          ? prev.filters.metric
          : (availableMetrics[0] ?? prev.filters.metric)

        return {
          ...prev,
          selectedExerciseId,
          filters: metric === prev.filters.metric ? prev.filters : { ...prev.filters, metric },
        }
      })
    }, []),

    setFilters,
    refresh: loadProgressData,
  }

  const chartPoints = useMemo(
    () =>
      buildProgressChartPoints(state.data, state.filters.metric, {
        exerciseId: state.selectedExerciseId,
      }),
    [state.data, state.filters.metric, state.selectedExerciseId],
  )

  return {
    state,
    chartPoints,
    actions,
  }
}
