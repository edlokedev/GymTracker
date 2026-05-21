import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProgressFilters, ProgressState } from '@/lib/types/progress'
import { fetchProgressData } from './client'
import {
  applyProgressDatePreset,
  buildProgressChartPoints,
  createProgressState,
  type ProgressDatePresetValue,
  summarizeProgress,
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

  const loadProgressData = useCallback(async () => {
    if (!userId) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await fetchProgressData(userId, state.filters)
      setState((prev) => ({
        ...prev,
        data: data.progress,
        isLoading: false,
        error: null,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch progress data',
      }))
    }
  }, [state.filters, userId])

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

    setSelectedChart: useCallback((selectedChart: ProgressState['selectedChart']) => {
      setState((prev) => ({ ...prev, selectedChart }))
    }, []),

    setShowTrendLines: useCallback((showTrendLines: boolean) => {
      setState((prev) => ({ ...prev, showTrendLines }))
    }, []),

    setHighlightPRs: useCallback((highlightPRs: boolean) => {
      setState((prev) => ({ ...prev, highlightPRs }))
    }, []),

    setFilters,
    refresh: loadProgressData,
  }

  const summary = useMemo(() => summarizeProgress(state.data), [state.data])
  const chartPoints = useMemo(
    () =>
      buildProgressChartPoints(state.data, state.filters.metric, {
        highlightPRs: state.highlightPRs,
      }),
    [state.data, state.filters.metric, state.highlightPRs],
  )

  return {
    state,
    summary,
    chartPoints,
    actions,
  }
}
