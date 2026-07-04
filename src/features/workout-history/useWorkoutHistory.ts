import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import type { WorkoutSession } from '@/lib/types/database'
import { parseCalendarDate } from '@/lib/utils/calendar'
import {
  deleteWorkoutHistorySession,
  duplicateWorkoutHistorySession,
  loadWorkoutHistoryPage,
  workoutDetailOptions,
  workoutHistoryListOptions,
} from './client'
import {
  getDeleteCandidateLabel,
  getLastWorkoutDate,
  removeSessionById,
  type WorkoutHistoryMode,
} from './model'

interface UseWorkoutHistoryOptions {
  userId?: string
  mode?: WorkoutHistoryMode
  limit?: number
  onDuplicated?: (session: WorkoutSession) => void
}

export function useWorkoutHistory({
  userId,
  mode = 'history',
  limit = mode === 'recent' ? 5 : 20,
  onDuplicated,
}: UseWorkoutHistoryOptions) {
  const queryClient = useQueryClient()
  const enabled = Boolean(userId)

  const [locationFilter, setLocationFilter] = useState<string | undefined>(undefined)
  // Pages 2+ from "load more" are appended here; the query owns page 1. A filter
  // change or refresh resets this back to the query-only page-1 view.
  const [appendedPages, setAppendedPages] = useState<WorkoutSession[]>([])
  const [page, setPage] = useState(1)
  const [hasMoreAppended, setHasMoreAppended] = useState<boolean | null>(null)

  // Sessions list — a thin useQuery. TanStack Query's last-request-wins retires
  // the old loadSessions stale-response race (it had no request token).
  const listQuery = useQuery({
    ...workoutHistoryListOptions({ limit, locationName: locationFilter }),
    enabled,
  })

  const firstPage = listQuery.data?.data ?? []
  const sessions = useMemo(
    () => (mode === 'history' ? [...firstPage, ...appendedPages] : firstPage),
    [firstPage, appendedPages, mode],
  )

  const hasMore = mode === 'history' ? (hasMoreAppended ?? listQuery.data?.hasMore ?? false) : false

  const isLoading = listQuery.isPending && enabled
  const error = listQuery.error ? 'Failed to load workout history' : null

  const loadMore = useCallback(async () => {
    if (mode !== 'history' || !hasMore || listQuery.isFetching) return
    const nextPage = page + 1
    const offset = (nextPage - 1) * limit
    try {
      const result = await loadWorkoutHistoryPage({ limit, offset, locationName: locationFilter })
      setAppendedPages((current) => [...current, ...result.data])
      setHasMoreAppended(result.hasMore)
      setPage(nextPage)
    } catch (loadError) {
      console.error('Error loading more workout history:', loadError)
    }
  }, [hasMore, limit, listQuery.isFetching, locationFilter, mode, page])

  const resetPagination = useCallback(() => {
    setAppendedPages([])
    setHasMoreAppended(null)
    setPage(1)
  }, [])

  const refresh = useCallback(async () => {
    resetPagination()
    await listQuery.refetch()
  }, [listQuery, resetPagination])

  const filterByLocation = useCallback(
    (name: string | undefined) => {
      resetPagination()
      setLocationFilter(name)
    },
    [resetPagination],
  )

  // Invalidate every server view a session mutation can touch: the sessions
  // list, the calendar summary, and exercise recents (duplicate/delete both add
  // or remove workout_sets rows that feed the recents ranking).
  const invalidateSessionViews = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.recent() })
  }, [queryClient])

  // --- Detail modal (driven by a keyed detail query) ---
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const detailQuery = useQuery({
    ...workoutDetailOptions(selectedSession ?? ({ id: '', date: '1970-01-01' } as WorkoutSession)),
    enabled: enabled && isModalOpen && selectedSession !== null,
  })

  const selectedWorkout = selectedSession ? (detailQuery.data ?? null) : null
  const isModalLoading = isModalOpen && selectedSession !== null && detailQuery.isPending

  const closeDetailModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const clearSelectedWorkout = useCallback(() => {
    setSelectedSession(null)
    setSelectedDate(null)
    setIsModalOpen(false)
  }, [])

  const openWorkoutDetails = useCallback(
    (session: WorkoutSession) => {
      if (!userId) return
      setSelectedSession(session)
      setSelectedDate(parseCalendarDate(session.date))
      setIsModalOpen(true)
    },
    [userId],
  )

  // --- Duplicate (its own mutation → its own error, never the delete UI) ---
  const duplicateMutation = useMutation({
    mutationFn: (sessionId: string) => duplicateWorkoutHistorySession(sessionId),
    onSuccess: (duplicated) => {
      onDuplicated?.(duplicated)
      invalidateSessionViews()
    },
  })

  const duplicateSession = useCallback(
    async (sessionId: string) => {
      try {
        return await duplicateMutation.mutateAsync(sessionId)
      } catch (duplicateError) {
        console.error('Failed to duplicate workout:', duplicateError)
        return null
      }
    },
    [duplicateMutation],
  )

  const duplicateError = duplicateMutation.error
    ? duplicateMutation.error instanceof Error && duplicateMutation.error.message
      ? duplicateMutation.error.message
      : 'Failed to duplicate workout'
    : null

  // --- Delete (its own mutation → its own error) ---
  const [deleteCandidate, setDeleteCandidate] = useState<WorkoutSession | null>(null)

  const removeDeletedSession = useCallback(
    (sessionId: string) => {
      setAppendedPages((current) => removeSessionById(current, sessionId))
      if (selectedSession?.id === sessionId) {
        clearSelectedWorkout()
      }
      invalidateSessionViews()
    },
    [clearSelectedWorkout, invalidateSessionViews, selectedSession?.id],
  )

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteWorkoutHistorySession(sessionId),
    onSuccess: (_data, sessionId) => {
      removeDeletedSession(sessionId)
    },
  })

  const deleteError = deleteMutation.error ? 'Failed to delete workout' : null
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null

  const requestDelete = useCallback(
    (session: WorkoutSession) => {
      deleteMutation.reset()
      setDeleteCandidate(session)
    },
    [deleteMutation],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return
    try {
      await deleteMutation.mutateAsync(deleteCandidate.id)
      setDeleteCandidate(null)
    } catch (deleteErr) {
      console.error('Failed to delete workout:', deleteErr)
    }
  }, [deleteCandidate, deleteMutation])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await deleteMutation.mutateAsync(sessionId)
    },
    [deleteMutation],
  )

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null)
    deleteMutation.reset()
  }, [deleteMutation])

  const updateSessionLocation = useCallback(
    (workoutId: string, locationName: string | null) => {
      // Patch the page-1 query cache (its rows are the query's, not local state)
      // and any appended pages so the list reflects the edit immediately.
      queryClient.setQueryData(
        workoutHistoryListOptions({ limit, locationName: locationFilter }).queryKey,
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((s) =>
                  s.id === workoutId ? { ...s, location_name: locationName ?? undefined } : s,
                ),
              }
            : current,
      )
      setAppendedPages((current) =>
        current.map((s) =>
          s.id === workoutId ? { ...s, location_name: locationName ?? undefined } : s,
        ),
      )
      setSelectedSession((prev) => {
        if (!prev || prev.id !== workoutId) return prev
        return { ...prev, location_name: locationName ?? undefined }
      })
    },
    [limit, locationFilter, queryClient],
  )

  const lastWorkoutDate = useMemo(() => getLastWorkoutDate(sessions), [sessions])
  const deleteCandidateLabel = useMemo(
    () => getDeleteCandidateLabel(deleteCandidate),
    [deleteCandidate],
  )

  return {
    sessions,
    isLoading,
    hasMore,
    error,
    lastWorkoutDate,
    duplicatingId: duplicateMutation.isPending ? duplicateMutation.variables : null,
    deletingId,
    duplicateError,
    deleteCandidate,
    deleteCandidateLabel,
    deleteError,
    isModalOpen,
    isModalLoading,
    selectedWorkout,
    selectedDate,
    locationFilter,
    actions: {
      loadMore,
      refresh,
      duplicateSession,
      requestDelete,
      confirmDelete,
      deleteSession,
      cancelDelete,
      openWorkoutDetails,
      closeDetailModal,
      removeDeletedSession,
      filterByLocation,
      updateSessionLocation,
    },
  }
}
