import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutSet,
  WorkoutSetInput,
} from '@/lib/types/database'
import { getLocalCalendarDate } from '@/lib/utils/calendar'
import {
  changeExerciseSets,
  completeWorkoutSession,
  createWorkoutSession,
  createWorkoutSet,
  deleteWorkoutSession,
  deleteWorkoutSet,
  removeExerciseSets,
  startWorkoutSessionFromTemplate,
  updateWorkoutSession,
  updateWorkoutSet,
  type WorkoutSessionWriteInput,
  type WorkoutSetHistoryItem,
  workoutSessionDetailOptions,
  workoutSetHistoryOptions,
} from './client'
import {
  addExerciseToWorkout,
  appendSetToExercise,
  type ExerciseInWorkout,
  getActiveExerciseId,
  getNextSetNumber,
  getSessionDuration,
  getTotalSets,
  getTotalVolume,
  hasExerciseInWorkout,
  mapWorkoutDetailsToExercises,
  mapWorkoutTemplateToExercises,
  removeExerciseFromWorkout,
  removeSetFromExercise,
  replaceExerciseInWorkout,
  replaceSetInExercise,
  type SaveStatus,
} from './model'

type WorkoutCommandStatus = 'idle' | 'running' | 'success' | 'error'

interface UseWorkoutSessionOptions {
  existingSession?: WorkoutSession
  initialTemplateId?: string
  onSessionSave?: (session: WorkoutSession) => void
  onSessionComplete?: (session: WorkoutSession) => void
  onSessionDelete?: (sessionId: string) => void | Promise<void>
}

function todayString(): string {
  return getLocalCalendarDate()
}

function nowISOString(): string {
  return new Date().toISOString()
}

function commandErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useWorkoutSession({
  existingSession,
  initialTemplateId,
  onSessionSave,
  onSessionComplete,
  onSessionDelete,
}: UseWorkoutSessionOptions) {
  const queryClient = useQueryClient()
  const existingSessionId = existingSession?.id
  const [session, setSession] = useState<WorkoutSession | null>(existingSession || null)
  const [exercises, setExercises] = useState<ExerciseInWorkout[]>([])
  const [sessionName, setSessionName] = useState(existingSession?.name || '')
  const [sessionNotes, setSessionNotes] = useState(existingSession?.notes || '')
  const [sessionLocation, setSessionLocation] = useState(existingSession?.location_name || '')
  const [sessionDate, setSessionDate] = useState(existingSession?.date || todayString())
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithParsedFields | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState(
    existingSession?.start_time || nowISOString(),
  )
  const [commandStatus, setCommandStatus] = useState<WorkoutCommandStatus>('idle')
  const [commandError, setCommandError] = useState<string | null>(null)
  const [lastPerformanceByExerciseId, setLastPerformanceByExerciseId] = useState<
    Record<string, WorkoutSet | undefined>
  >({})
  // `saveStatus` is derived from the save mutation for saving/error; 'saved'
  // lingers briefly (UX) via the single cleaned-up timer below.
  const [saveStatusOverride, setSaveStatusOverride] = useState<SaveStatus | null>(null)
  const startedTemplateIdRef = useRef<string | null>(null)
  // Track whether the user explicitly changed date / start time, so startSession
  // can recompute "now" at submit time (a page left open across midnight must not
  // log yesterday's date or a stale start timestamp).
  const userEditedDateRef = useRef(false)
  const userEditedStartTimeRef = useRef(false)
  // Single UX timer for the lingering "Saved ✓" / transient error, cleaned up on
  // unmount and re-arm. Replaces the three previously-uncleared setTimeouts.
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const beginCommand = useCallback(() => {
    setCommandStatus('running')
    setCommandError(null)
  }, [])

  const finishCommand = useCallback(() => {
    setCommandStatus('success')
  }, [])

  const failCommand = useCallback((error: unknown, fallback: string) => {
    setCommandStatus('error')
    setCommandError(commandErrorMessage(error, fallback))
  }, [])

  const clearCommandError = useCallback(() => {
    setCommandError(null)
    setCommandStatus('idle')
  }, [])

  const armSaveStatus = useCallback((status: SaveStatus, clearAfterMs: number) => {
    setSaveStatusOverride(status)
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatusOverride(null)
      saveStatusTimerRef.current = null
    }, clearAfterMs)
  }, [])

  // Clear the lingering save-status timer on unmount so it never fires against a
  // deleted session.
  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
    }
  }, [])

  const resetSession = useCallback(() => {
    setSession(null)
    setExercises([])
    setSessionName('')
    setSessionNotes('')
    setSessionLocation('')
    setSessionDate(todayString())
    setSelectedExercise(null)
    setActiveExerciseId(null)
    setSessionStartTime(nowISOString())
    setSaveStatusOverride(null)
    setCommandStatus('idle')
    setCommandError(null)
    setLastPerformanceByExerciseId({})
    userEditedDateRef.current = false
    userEditedStartTimeRef.current = false
  }, [])

  const mapHistoryItemToWorkoutSet = useCallback(
    (exerciseId: string, item: WorkoutSetHistoryItem): WorkoutSet => ({
      id: item.id,
      workout_id: '',
      exercise_id: exerciseId,
      set_number: item.set_number,
      reps: item.reps > 0 ? item.reps : undefined,
      weight: item.weight >= 0 ? item.weight : undefined,
      duration_seconds: item.duration_seconds,
      distance_km: item.distance_km,
      incline: item.incline,
      speed_kmh: item.speed_kmh,
      created_at: new Date(`${item.session_date}T00:00:00.000Z`),
      updated_at: new Date(`${item.session_date}T00:00:00.000Z`),
    }),
    [],
  )

  // Fetch (through Query — cached + deduped) the last logged set for one
  // exercise and merge it into the prefill map. Merging is keyed by exercise id,
  // so it is idempotent and race-safe: a result that arrives after a session
  // switch is still the correct last-performance for that exercise. This is why
  // the old `prefillRequestRef` monotonic token is gone (ADR-0007, Phase 4).
  const loadLastPerformanceDefaults = useCallback(
    async (exerciseId: string) => {
      try {
        const [lastSet] = await queryClient.fetchQuery(workoutSetHistoryOptions(exerciseId, 1))
        if (!lastSet) return

        setLastPerformanceByExerciseId((current) => ({
          ...current,
          [exerciseId]: mapHistoryItemToWorkoutSet(exerciseId, lastSet),
        }))
      } catch (error) {
        console.error('Failed to load last performance defaults:', error)
      }
    },
    [mapHistoryItemToWorkoutSet, queryClient],
  )

  // Batch variant: load last-performance defaults for several exercises at once
  // (used when starting from a saved workout/template or resuming a session,
  // where exercises are added without going through addExercise). Each fetch
  // flows through Query keyed by exercise id, and the merge stays keyed by
  // exercise id — last-request-wins per exercise, no monotonic token needed.
  const loadLastPerformanceDefaultsForExercises = useCallback(
    async (exerciseIds: string[]) => {
      const uniqueIds = [...new Set(exerciseIds)].filter(Boolean)
      if (uniqueIds.length === 0) return

      const results = await Promise.allSettled(
        uniqueIds.map(async (id) => {
          const [lastSet] = await queryClient.fetchQuery(workoutSetHistoryOptions(id, 1))
          return lastSet ? ([id, mapHistoryItemToWorkoutSet(id, lastSet)] as const) : null
        }),
      )

      const merged: Record<string, WorkoutSet> = {}
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          merged[result.value[0]] = result.value[1]
        }
      }
      if (Object.keys(merged).length === 0) return

      setLastPerformanceByExerciseId((current) => ({ ...current, ...merged }))
    },
    [mapHistoryItemToWorkoutSet, queryClient],
  )

  // Active-session bootstrap → query (ADR-0007, Phase 4). Query owns the server
  // read; the effect below seeds the local in-flight editing state from it.
  const detailQuery = useQuery({
    ...workoutSessionDetailOptions(existingSessionId ?? ''),
    enabled: Boolean(existingSessionId),
  })

  // Seed local editing state from the bootstrap query once its data arrives for
  // the current session. Guarded by the loaded session id so re-renders (or a
  // background refetch) don't stomp in-progress edits.
  const seededSessionIdRef = useRef<string | null>(null)
  // Set once the user edits the in-flight exercise list (add/remove/save/change),
  // so a late-arriving bootstrap seed never stomps their work. Reset on session
  // switch. This is the local-editing-wins half of "Query owns server sync, local
  // state owns in-flight editing".
  const userEditedExercisesRef = useRef(false)
  // The detail query is keyed by the requested session id, so its data is the
  // response for *this* session even if the payload's own id differs (e.g. a
  // detail endpoint that returns the day's sessions). Seed once per requested id.
  const detailFetchStatus = detailQuery.fetchStatus
  const loadedDetail =
    detailQuery.isSuccess && detailFetchStatus === 'idle' ? detailQuery.data : undefined
  useEffect(() => {
    if (!existingSessionId) return
    if (!loadedDetail) return
    if (seededSessionIdRef.current === existingSessionId) return
    if (userEditedExercisesRef.current) return
    seededSessionIdRef.current = existingSessionId

    setSession(loadedDetail)
    setSessionName(loadedDetail.name || '')
    setSessionNotes(loadedDetail.notes || '')
    setSessionLocation(loadedDetail.location_name || '')
    setSessionDate(loadedDetail.date)
    setSessionStartTime(loadedDetail.start_time)
    const loadedExercises = mapWorkoutDetailsToExercises(loadedDetail)
    setExercises(loadedExercises)
    setActiveExerciseId((currentActiveExerciseId) =>
      getActiveExerciseId(loadedExercises, currentActiveExerciseId),
    )
    // Prefill last-performance only for exercises with no in-session sets —
    // exercises that already have sets prefill from their last logged set
    // (previousSet wins over lastPerformance), so fetching history for them
    // would be wasted requests.
    void loadLastPerformanceDefaultsForExercises(
      loadedExercises
        .filter((exercise) => exercise.sets.length === 0)
        .map((exercise) => exercise.exercise.id),
    )
  }, [existingSessionId, loadedDetail, loadLastPerformanceDefaultsForExercises])

  // Imperative reload used after "change exercise" repoints sets server-side.
  const reloadSessionData = useCallback(
    async (sessionId: string) => {
      const workout = await queryClient.fetchQuery({
        ...workoutSessionDetailOptions(sessionId),
        // Force a fresh read; the repoint just mutated the server rows.
        staleTime: 0,
      })
      setSession(workout)
      setSessionName(workout.name || '')
      setSessionNotes(workout.notes || '')
      setSessionLocation(workout.location_name || '')
      setSessionDate(workout.date)
      setSessionStartTime(workout.start_time)
      const loadedExercises = mapWorkoutDetailsToExercises(workout)
      setExercises(loadedExercises)
      setActiveExerciseId((currentActiveExerciseId) =>
        getActiveExerciseId(loadedExercises, currentActiveExerciseId),
      )
      void loadLastPerformanceDefaultsForExercises(
        loadedExercises
          .filter((exercise) => exercise.sets.length === 0)
          .map((exercise) => exercise.exercise.id),
      )
    },
    [loadLastPerformanceDefaultsForExercises, queryClient],
  )

  // On a session switch: with no existing session, reset; with one, eagerly seed
  // `session` from the prop (its id is the requested id) so consumers see the new
  // session id immediately — the bootstrap query then refines the full detail.
  // Guarded by seededSessionIdRef so the eager prop-seed runs once per switch and
  // doesn't stomp in-flight edits on unrelated re-renders.
  // biome-ignore lint/correctness/useExhaustiveDependencies: session?.id is only an early-return guard; the effect keys off existingSessionId (the requested id), not session state — adding session would re-run it on every save.
  useEffect(() => {
    if (!existingSessionId) {
      seededSessionIdRef.current = null
      userEditedExercisesRef.current = false
      resetSession()
      return
    }
    if (seededSessionIdRef.current === existingSessionId) return
    if (session?.id === existingSessionId) return
    // New session requested: allow the bootstrap seed to repopulate.
    userEditedExercisesRef.current = false
    setSession(existingSession ?? null)
    setSessionName(existingSession?.name || '')
    setSessionNotes(existingSession?.notes || '')
    setSessionLocation(existingSession?.location_name || '')
    setSessionDate(existingSession?.date || todayString())
    setSessionStartTime(existingSession?.start_time || nowISOString())
    // Exercises / active / last-performance are refreshed by the bootstrap query
    // seed below (not cleared here) to avoid an empty-list flash between the
    // eager id swap and the detail arriving.
  }, [existingSessionId, existingSession, resetSession])

  // Invalidate every server view a session/set mutation can touch. `withSets`
  // adds exercise recents (only set-touching writes change the workout_sets rows
  // that feed the recents ranking).
  const invalidateSessionViews = useCallback(
    ({ withSets }: { withSets: boolean }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
      if (withSets) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.recent() })
      }
    },
    [queryClient],
  )

  // --- Session lifecycle mutations ---

  const createSessionMutation = useMutation({
    mutationFn: (data: WorkoutSessionWriteInput) => createWorkoutSession(data),
    onSuccess: (newSession) => {
      setSession(newSession)
      setSessionDate(newSession.date)
      setSessionStartTime(newSession.start_time)
      onSessionSave?.(newSession)
      invalidateSessionViews({ withSets: false })
    },
  })

  const startSession = useCallback(async () => {
    beginCommand()

    // Recompute "now" at submit time unless the user explicitly set them — a
    // page mounted before midnight must not log yesterday's date / a stale start.
    const dateToUse = userEditedDateRef.current ? sessionDate : getLocalCalendarDate()
    const startTimeToUse = userEditedStartTimeRef.current ? sessionStartTime : nowISOString()

    const sessionData: WorkoutSessionWriteInput = {
      name: sessionName.trim() || undefined,
      date: dateToUse,
      notes: sessionNotes.trim() || undefined,
      start_time: startTimeToUse,
      location_name: sessionLocation.trim() || undefined,
    }

    try {
      await createSessionMutation.mutateAsync(sessionData)
      finishCommand()
    } catch (error) {
      console.error('Failed to start session:', error)
      failCommand(error, 'Failed to start workout session')
    }
  }, [
    beginCommand,
    createSessionMutation,
    failCommand,
    finishCommand,
    sessionDate,
    sessionLocation,
    sessionName,
    sessionNotes,
    sessionStartTime,
  ])

  const startFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => startWorkoutSessionFromTemplate(templateId),
    onSuccess: (result) => {
      const plannedExercises = mapWorkoutTemplateToExercises(result.template)
      setSession(result.session)
      setSessionName(result.session.name || '')
      setSessionNotes(result.session.notes || '')
      setSessionLocation(result.session.location_name || '')
      setSessionDate(result.session.date)
      setSessionStartTime(result.session.start_time)
      setExercises(plannedExercises)
      setActiveExerciseId(getActiveExerciseId(plannedExercises, null))
      // Prefill last-performance values for the template's exercises, matching
      // the manual-add behaviour (this is the saved-workout prefill bug fix).
      void loadLastPerformanceDefaultsForExercises(
        plannedExercises.map((exercise) => exercise.exercise.id),
      )
      onSessionSave?.(result.session)
      invalidateSessionViews({ withSets: false })
    },
  })

  const startSessionFromTemplate = useCallback(
    async (templateId: string) => {
      beginCommand()
      try {
        await startFromTemplateMutation.mutateAsync(templateId)
        finishCommand()
      } catch (error) {
        console.error('Failed to start workout from template:', error)
        failCommand(error, 'Failed to start workout from template')
      }
    },
    [beginCommand, failCommand, finishCommand, startFromTemplateMutation],
  )

  useEffect(() => {
    if (!initialTemplateId || existingSessionId || session?.id) return
    if (startedTemplateIdRef.current === initialTemplateId) return
    startedTemplateIdRef.current = initialTemplateId
    void startSessionFromTemplate(initialTemplateId)
  }, [existingSessionId, initialTemplateId, session?.id, startSessionFromTemplate])

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkoutSessionWriteInput> }) =>
      updateWorkoutSession(id, data),
    onSuccess: (updatedSession) => {
      setSession(updatedSession)
      onSessionSave?.(updatedSession)
      invalidateSessionViews({ withSets: false })
    },
  })

  const saveSession = useCallback(async () => {
    if (!session) return

    if (!sessionDate || Number.isNaN(Date.parse(sessionDate))) {
      setCommandStatus('error')
      setCommandError('Choose a valid workout date before saving.')
      armSaveStatus('error', 3000)
      return
    }

    beginCommand()
    try {
      const locationValue = sessionLocation.trim()
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          name: sessionName.trim(),
          notes: sessionNotes.trim(),
          date: sessionDate,
          location_name: locationValue === '' ? null : locationValue,
        },
      })
      finishCommand()
      armSaveStatus('saved', 2500)
    } catch (error) {
      console.error('Failed to update session:', error)
      failCommand(error, 'Failed to update workout session')
      armSaveStatus('error', 3000)
    }
  }, [
    armSaveStatus,
    beginCommand,
    failCommand,
    finishCommand,
    session,
    sessionDate,
    sessionLocation,
    sessionName,
    sessionNotes,
    updateSessionMutation,
  ])

  const completeSessionMutation = useMutation({
    mutationFn: (id: string) => completeWorkoutSession(id),
    onSuccess: (completedSession) => {
      setSession(completedSession)
      onSessionComplete?.(completedSession)
      invalidateSessionViews({ withSets: false })
    },
  })

  const completeSession = useCallback(async () => {
    if (!session) return

    beginCommand()
    try {
      await completeSessionMutation.mutateAsync(session.id)
      finishCommand()
    } catch (error) {
      console.error('Failed to complete session:', error)
      failCommand(error, 'Failed to complete workout session')
    }
  }, [beginCommand, completeSessionMutation, failCommand, finishCommand, session])

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => deleteWorkoutSession(id),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const deleteSession = useCallback(async () => {
    if (!session) return false

    beginCommand()
    try {
      await deleteSessionMutation.mutateAsync(session.id)

      if (onSessionDelete) {
        await onSessionDelete(session.id)
        finishCommand()
        return true
      }

      resetSession()
      finishCommand()
      return true
    } catch (error) {
      console.error('Failed to delete session:', error)
      failCommand(error, 'Failed to delete workout')
      return false
    }
  }, [
    beginCommand,
    deleteSessionMutation,
    failCommand,
    finishCommand,
    onSessionDelete,
    resetSession,
    session,
  ])

  // --- Exercise + set editing ---

  const addExercise = useCallback(
    (exercise: ExerciseWithParsedFields) => {
      // Compute the result first, then set state, then run the effect (prefill)
      // — no setState from inside a state updater (issue #0011; StrictMode
      // double-invokes updaters).
      setSelectedExercise(null)

      if (hasExerciseInWorkout(exercises, exercise.id)) {
        setCommandStatus('error')
        setCommandError('This exercise is already in your workout.')
        return
      }

      const { exercises: nextExercises } = addExerciseToWorkout(exercises, exercise)
      userEditedExercisesRef.current = true
      setExercises(nextExercises)
      setCommandStatus('success')
      setCommandError(null)
      setActiveExerciseId(exercise.id)
      void loadLastPerformanceDefaults(exercise.id)
    },
    [exercises, loadLastPerformanceDefaults],
  )

  const removeExerciseSetsMutation = useMutation({
    mutationFn: ({ sessionId, exerciseId }: { sessionId: string; exerciseId: string }) =>
      removeExerciseSets(sessionId, exerciseId),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      try {
        if (session?.id) {
          beginCommand()
          await removeExerciseSetsMutation.mutateAsync({ sessionId: session.id, exerciseId })
        }

        // Compute the next value first, then set state, then run the effect
        // (reselect active exercise) — no setState from inside a state updater
        // (issue #0011).
        const nextExercises = removeExerciseFromWorkout(exercises, exerciseId)
        userEditedExercisesRef.current = true
        setExercises(nextExercises)
        setActiveExerciseId((currentActiveExerciseId) =>
          getActiveExerciseId(
            nextExercises,
            currentActiveExerciseId === exerciseId ? null : currentActiveExerciseId,
          ),
        )
        finishCommand()
        return true
      } catch (error) {
        console.error('Failed to remove exercise:', error)
        failCommand(error, 'Failed to remove exercise')
        return false
      }
    },
    [beginCommand, exercises, failCommand, finishCommand, removeExerciseSetsMutation, session?.id],
  )

  // "Change exercise": repoint a logged group to a different exercise, keeping
  // its sets. Persisted workouts go through the atomic RPC then reload; an
  // unsaved workout swaps locally. Fast-fails on a client-visible duplicate
  // (the server still blocks authoritatively with a 409).
  const changeExerciseMutation = useMutation({
    mutationFn: ({
      sessionId,
      fromExerciseId,
      toExerciseId,
    }: {
      sessionId: string
      fromExerciseId: string
      toExerciseId: string
    }) => changeExerciseSets(sessionId, fromExerciseId, toExerciseId),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const changeExercise = useCallback(
    async (fromExerciseId: string, toExercise: ExerciseWithParsedFields): Promise<boolean> => {
      if (fromExerciseId === toExercise.id) return false
      if (hasExerciseInWorkout(exercises, toExercise.id)) {
        setCommandStatus('error')
        setCommandError('That exercise is already in your workout.')
        return false
      }

      try {
        beginCommand()
        if (session?.id) {
          await changeExerciseMutation.mutateAsync({
            sessionId: session.id,
            fromExerciseId,
            toExerciseId: toExercise.id,
          })
          await reloadSessionData(session.id)
        } else {
          setExercises((current) => replaceExerciseInWorkout(current, fromExerciseId, toExercise))
        }
        setActiveExerciseId((currentId) =>
          currentId === fromExerciseId ? toExercise.id : currentId,
        )
        void loadLastPerformanceDefaults(toExercise.id)
        finishCommand()
        return true
      } catch (error) {
        console.error('Failed to change exercise:', error)
        failCommand(error, 'Failed to change exercise')
        return false
      }
    },
    [
      beginCommand,
      changeExerciseMutation,
      exercises,
      failCommand,
      finishCommand,
      loadLastPerformanceDefaults,
      reloadSessionData,
      session?.id,
    ],
  )

  const saveSetMutation = useMutation({
    mutationFn: (setData: WorkoutSetInput) => createWorkoutSet(setData),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const saveSet = useCallback(
    async (exerciseId: string, setData: WorkoutSetInput): Promise<WorkoutSet | null> => {
      if (!session) return null

      try {
        beginCommand()
        const newSet = await saveSetMutation.mutateAsync(setData)
        userEditedExercisesRef.current = true
        setExercises((currentExercises) =>
          appendSetToExercise(currentExercises, exerciseId, newSet),
        )
        finishCommand()
        return newSet
      } catch (error) {
        console.error('Failed to save set:', error)
        failCommand(error, 'Failed to save set')
        return null
      }
    },
    [beginCommand, failCommand, finishCommand, saveSetMutation, session],
  )

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, setData }: { setId: string; setData: WorkoutSetInput }) =>
      updateWorkoutSet(setId, setData),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const updateSet = useCallback(
    async (
      exerciseId: string,
      setId: string,
      setData: WorkoutSetInput,
    ): Promise<WorkoutSet | null> => {
      try {
        beginCommand()
        const updatedSet = await updateSetMutation.mutateAsync({ setId, setData })
        setExercises((currentExercises) =>
          replaceSetInExercise(currentExercises, exerciseId, setId, updatedSet),
        )
        finishCommand()
        return updatedSet
      } catch (error) {
        console.error('Failed to update set:', error)
        failCommand(error, 'Failed to update set')
        return null
      }
    },
    [beginCommand, failCommand, finishCommand, updateSetMutation],
  )

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => deleteWorkoutSet(setId),
    onSuccess: () => {
      invalidateSessionViews({ withSets: true })
    },
  })

  const deleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      try {
        beginCommand()
        await deleteSetMutation.mutateAsync(setId)
        setExercises((currentExercises) =>
          removeSetFromExercise(currentExercises, exerciseId, setId),
        )
        finishCommand()
        return true
      } catch (error) {
        console.error('Failed to delete set:', error)
        failCommand(error, 'Failed to delete set')
        return false
      }
    },
    [beginCommand, deleteSetMutation, failCommand, finishCommand],
  )

  // Public setters that record an explicit user edit (so startSession knows not
  // to overwrite them with a freshly-computed "now").
  const setSessionDateEdited = useCallback((value: string) => {
    userEditedDateRef.current = true
    setSessionDate(value)
  }, [])
  const setSessionStartTimeEdited = useCallback((value: string) => {
    userEditedStartTimeRef.current = true
    setSessionStartTime(value)
  }, [])

  // `loading` gates the lifecycle buttons (Start/Complete/Delete) — it reflects
  // an in-flight session-lifecycle command, plus the very first bootstrap read
  // when there is no session yet to show (an existing session is prop-seeded, so
  // its buttons stay live while the detail refetches in the background).
  const loading =
    (Boolean(existingSessionId) && !session && detailQuery.isPending) ||
    createSessionMutation.isPending ||
    startFromTemplateMutation.isPending ||
    completeSessionMutation.isPending ||
    deleteSessionMutation.isPending

  // `saveStatus` is the save mutation's live state, with the lingering
  // 'saved'/'error' override taking precedence while its timer runs.
  const saveStatus: SaveStatus =
    saveStatusOverride ?? (updateSessionMutation.isPending ? 'saving' : 'idle')

  const totalSets = useMemo(() => getTotalSets(exercises), [exercises])
  const totalVolume = useMemo(() => getTotalVolume(exercises), [exercises])
  const sessionDuration = useMemo(() => getSessionDuration(session), [session])
  const resolvedActiveExerciseId = useMemo(
    () =>
      activeExerciseId && exercises.some((exercise) => exercise.exercise.id === activeExerciseId)
        ? activeExerciseId
        : null,
    [activeExerciseId, exercises],
  )
  const activeExercise = useMemo(
    () =>
      resolvedActiveExerciseId
        ? (exercises.find((exercise) => exercise.exercise.id === resolvedActiveExerciseId) ?? null)
        : null,
    [exercises, resolvedActiveExerciseId],
  )

  return {
    session,
    exercises,
    sessionName,
    sessionNotes,
    sessionLocation,
    sessionDate,
    selectedExercise,
    activeExerciseId: resolvedActiveExerciseId,
    activeExercise,
    sessionStartTime,
    isSessionStarted: Boolean(session),
    loading,
    saveStatus,
    commandStatus,
    commandError,
    totalSets,
    totalVolume,
    lastPerformanceByExerciseId,
    sessionDuration,
    setSessionName,
    setSessionNotes,
    setSessionLocation,
    setSessionDate: setSessionDateEdited,
    setSessionStartTime: setSessionStartTimeEdited,
    actions: {
      startSession,
      startSessionFromTemplate,
      saveSession,
      completeSession,
      deleteSession,
      addExercise,
      selectActiveExercise: setActiveExerciseId,
      removeExercise,
      changeExercise,
      saveSet,
      updateSet,
      deleteSet,
      getNextSetNumber,
      clearCommandError,
    },
  }
}
