import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { ExerciseProgress, ProgressFilters, ProgressState } from '@/lib/types/progress'
import { fetchProgressData, progressDataOptions } from './client'
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

const EMPTY_PROGRESS: ExerciseProgress[] = []

export function useProgressDashboard({ userId, initialFilters }: UseProgressDashboardOptions) {
  const [filters, setFiltersState] = useState<ProgressFilters>(() => ({
    ...createProgressState().filters,
    ...initialFilters,
  }))
  const [preferredExerciseId, setPreferredExerciseId] = useState<string | null>(null)
  // Metrics are display-only: the response already contains every metric.
  const dataFilters = useMemo<ProgressFilters>(
    () => ({ exerciseIds: filters.exerciseIds, dateRange: filters.dateRange, metric: 'volume' }),
    [filters.exerciseIds, filters.dateRange],
  )
  const options = progressDataOptions(dataFilters)
  const query = useQuery({
    queryKey: [...options.queryKey, userId],
    queryFn: () => fetchProgressData(dataFilters),
    enabled: Boolean(userId),
  })
  const data = userId ? (query.data?.progress ?? EMPTY_PROGRESS) : EMPTY_PROGRESS
  const selectedExerciseId = data.some((exercise) => exercise.exerciseId === preferredExerciseId)
    ? preferredExerciseId
    : findMostRecentExerciseId(data)
  const selectedExercise = data.find((exercise) => exercise.exerciseId === selectedExerciseId)
  const availableMetrics = selectedExercise ? getAvailableProgressMetrics(selectedExercise) : []
  const metric = availableMetrics.includes(filters.metric)
    ? filters.metric
    : (availableMetrics[0] ?? filters.metric)
  const state: ProgressState = {
    filters: metric === filters.metric ? filters : { ...filters, metric },
    data,
    selectedExerciseId,
    isLoading: Boolean(userId) && query.isFetching,
    error: userId && query.error ? query.error.message : null,
  }

  const setFilters = useCallback((next: Partial<ProgressFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...next,
      dateRange: next.dateRange || prev.dateRange,
      exerciseIds: next.exerciseIds || prev.exerciseIds,
    }))
  }, [])
  const { refetch } = query
  const refresh = useCallback(async () => {
    if (userId) await refetch()
  }, [refetch, userId])

  const actions = {
    setMetric: useCallback((nextMetric: ProgressFilters['metric']) => {
      setFiltersState((prev) => ({ ...prev, metric: nextMetric }))
    }, []),
    setDatePreset: useCallback((presetValue: ProgressDatePresetValue) => {
      setFiltersState((prev) => applyProgressDatePreset(prev, presetValue))
    }, []),
    setDateRange: useCallback((dateRange: ProgressFilters['dateRange']) => {
      setFiltersState((prev) => ({ ...prev, dateRange }))
    }, []),
    setExerciseIds: useCallback((exerciseIds: string[]) => {
      setFiltersState((prev) => ({ ...prev, exerciseIds }))
    }, []),
    setSelectedExerciseId: useCallback(
      (exerciseId: string) => {
        setPreferredExerciseId(exerciseId)
        setFiltersState((prev) => ({ ...prev, metric }))
      },
      [metric],
    ),
    setFilters,
    refresh,
  }
  const chartPoints = useMemo(
    () => buildProgressChartPoints(data, metric, { exerciseId: selectedExerciseId }),
    [data, metric, selectedExerciseId],
  )

  return { state, chartPoints, actions }
}
