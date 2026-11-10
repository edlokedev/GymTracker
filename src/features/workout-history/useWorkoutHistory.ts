import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import type { WorkoutSession } from '@/lib/types/database'
import { parseCalendarDate } from '@/lib/utils/calendar'
import {
  deleteWorkoutHistorySession,
  duplicateWorkoutHistorySession,
  workoutDetailOptions,
  workoutHistoryListOptions,
} from './client'
import { getDeleteCandidateLabel, getLastWorkoutDate, type WorkoutHistoryMode } from './model'

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
  // One infinite query per filter owns every loaded page, so a refetch after a
  // mutation re-reads all pages together (no overlap with a separately-held
  // page 1) and a slow "load more" for an old filter lands in the old entry.
  const listQuery = useInfiniteQuery({
    ...workoutHistoryListOptions({ limit, locationName: locationFilter }),
    enabled,
  })

  const loadedPages = listQuery.data?.pages
  const sessions = useMemo(() => {
    const pages = mode === 'history' ? (loadedPages ?? []) : (loadedPages?.slice(0, 1) ?? [])
    // Defensive: a row can shift across offset boundaries if the list changes
    // between page fetches; never render (or key) the same session twice.
    const seen = new Set<string>()
    return pages
      .flatMap((page) => page.data)
      .filter((session) => !seen.has(session.id) && seen.add(session.id))
  }, [loadedPages, mode])

  const hasMore = mode === 'history' ? listQuery.hasNextPage : false

  const isLoading = listQuery.isPending && enabled
  const error = listQuery.error ? 'Failed to load workout history' : null

  const { fetchNextPage, isFetching, refetch } = listQuery
  const loadMore = useCallback(async () => {
    if (mode !== 'history' || !hasMore || isFetching) return
    const result = await fetchNextPage()
    if (result.isError) console.error('Error loading more workout history:', result.error)
  }, [fetchNextPage, hasMore, isFetching, mode])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const filterByLocation = useCallback((name: string | undefined) => {
    setLocationFilter(name)
  }, [])

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
      // Patch every loaded page in the query cache so the list reflects the
      // edit immediately.
      queryClient.setQueryData(
        workoutHistoryListOptions({ limit, locationName: locationFilter }).queryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  data: page.data.map((s) =>
                    s.id === workoutId ? { ...s, location_name: locationName ?? undefined } : s,
                  ),
                })),
              }
            : current,
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
