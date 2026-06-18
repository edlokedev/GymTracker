import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkoutSession } from '@/lib/types/database'
import {
  deleteWorkoutHistorySession,
  duplicateWorkoutHistorySession,
  loadWorkoutDetailsForSession,
  loadWorkoutHistorySessions,
} from './client'
import {
  getDeleteCandidateLabel,
  getLastWorkoutDate,
  removeSessionById,
  type SelectedWorkout,
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
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string | undefined>(undefined)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<WorkoutSession | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<SelectedWorkout | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Ref so loadMore can always read the latest filter without needing it in
  // loadSessions's dep array (which would cause a double-fetch on filter change).
  const locationFilterRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    locationFilterRef.current = locationFilter
  }, [locationFilter])

  const loadSessions = useCallback(
    async (pageNum = 1, append = false, overrideLocationFilter?: string | undefined | null) => {
      if (!userId) {
        setSessions([])
        setHasMore(false)
        setIsLoading(false)
        return
      }

      try {
        setError(null)
        setIsLoading(true)
        const offset = mode === 'recent' ? undefined : (pageNum - 1) * limit
        // `null` = clear filter; `undefined` = use ref (avoids stale closure)
        const activeFilter =
          overrideLocationFilter === undefined
            ? locationFilterRef.current
            : (overrideLocationFilter ?? undefined)
        const result = await loadWorkoutHistorySessions({
          limit,
          offset,
          locationName: activeFilter,
        })

        setSessions((currentSessions) =>
          append ? [...currentSessions, ...result.data] : result.data,
        )
        setHasMore(mode === 'history' ? result.hasMore : false)
        setPage(pageNum)
      } catch (loadError) {
        console.error('Error loading workout history:', loadError)
        setError('Failed to load workout history')
      } finally {
        setIsLoading(false)
      }
    },
    [limit, mode, userId],
  )

  useEffect(() => {
    void loadSessions(1, false)
  }, [loadSessions])

  const loadMore = useCallback(async () => {
    if (mode !== 'history' || !hasMore || isLoading) return
    await loadSessions(page + 1, true)
  }, [hasMore, isLoading, loadSessions, mode, page])

  const duplicateSession = useCallback(
    async (sessionId: string) => {
      setDuplicatingId(sessionId)
      setDeleteError(null)

      try {
        const duplicatedSession = await duplicateWorkoutHistorySession(sessionId)
        onDuplicated?.(duplicatedSession)
        return duplicatedSession
      } catch (duplicateError) {
        console.error('Failed to duplicate workout:', duplicateError)
        setDeleteError(
          duplicateError instanceof Error && duplicateError.message
            ? duplicateError.message
            : 'Failed to duplicate workout',
        )
        return null
      } finally {
        setDuplicatingId(null)
      }
    },
    [onDuplicated],
  )

  const requestDelete = useCallback((session: WorkoutSession) => {
    setDeleteError(null)
    setDeleteCandidate(session)
  }, [])

  const closeDetailModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const clearSelectedWorkout = useCallback(() => {
    setSelectedWorkout(null)
    setSelectedDate(null)
    setIsModalOpen(false)
  }, [])

  const removeDeletedSession = useCallback(
    (sessionId: string) => {
      setSessions((currentSessions) => removeSessionById(currentSessions, sessionId))

      if (selectedWorkout?.id === sessionId) {
        clearSelectedWorkout()
      }
    },
    [clearSelectedWorkout, selectedWorkout?.id],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return

    const session = deleteCandidate
    setDeleteError(null)
    setDeletingId(session.id)

    try {
      await deleteWorkoutHistorySession(session.id)
      removeDeletedSession(session.id)
      setDeleteCandidate(null)
    } catch (deleteErrorResult) {
      console.error('Failed to delete workout:', deleteErrorResult)
      setDeleteError('Failed to delete workout')
    } finally {
      setDeletingId(null)
    }
  }, [deleteCandidate, removeDeletedSession])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      setDeleteError(null)
      setDeletingId(sessionId)

      try {
        await deleteWorkoutHistorySession(sessionId)
        removeDeletedSession(sessionId)
      } catch (deleteErrorResult) {
        console.error('Failed to delete workout:', deleteErrorResult)
        setDeleteError('Failed to delete workout')
        throw deleteErrorResult
      } finally {
        setDeletingId(null)
      }
    },
    [removeDeletedSession],
  )

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null)
    setDeleteError(null)
  }, [])

  const openWorkoutDetails = useCallback(
    async (session: WorkoutSession) => {
      if (!userId) return

      setSelectedDate(new Date(session.date))
      setIsModalOpen(true)
      setIsModalLoading(true)

      try {
        setSelectedWorkout(await loadWorkoutDetailsForSession({ session }))
      } catch (detailsError) {
        console.error('Failed to load workout details:', detailsError)
        setSelectedWorkout(null)
      } finally {
        setIsModalLoading(false)
      }
    },
    [userId],
  )

  const filterByLocation = useCallback(
    (name: string | undefined) => {
      setLocationFilter(name)
      void loadSessions(1, false, name ?? null)
    },
    [loadSessions],
  )

  const updateSessionLocation = useCallback((workoutId: string, locationName: string | null) => {
    setSessions((current) =>
      current.map((s) =>
        s.id === workoutId ? { ...s, location_name: locationName ?? undefined } : s,
      ),
    )
    setSelectedWorkout((prev) => {
      if (!prev || prev.id !== workoutId) return prev
      return { ...prev, locationName: locationName ?? undefined }
    })
  }, [])

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
    duplicatingId,
    deletingId,
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
      refresh: () => loadSessions(1, false),
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
