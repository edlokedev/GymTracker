import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutSet,
  WorkoutSetInput,
} from '@/lib/types/database'
import {
  completeWorkoutSession,
  createWorkoutSession,
  createWorkoutSet,
  deleteWorkoutSession,
  deleteWorkoutSet,
  loadWorkoutSessionDetails,
  loadWorkoutSetHistory,
  removeExerciseSets,
  startWorkoutSessionFromTemplate,
  updateWorkoutSession,
  updateWorkoutSet,
  type WorkoutSessionWriteInput,
  type WorkoutSetHistoryItem,
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
  return new Date().toISOString().split('T')[0]
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
  const existingSessionId = existingSession?.id
  const existingSessionUserId = existingSession?.user_id
  const existingSessionName = existingSession?.name
  const existingSessionDate = existingSession?.date
  const existingSessionStartTime = existingSession?.start_time
  const existingSessionEndTime = existingSession?.end_time
  const existingSessionNotes = existingSession?.notes
  const existingSessionLocation = existingSession?.location_name
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
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [commandStatus, setCommandStatus] = useState<WorkoutCommandStatus>('idle')
  const [commandError, setCommandError] = useState<string | null>(null)
  const [lastPerformanceByExerciseId, setLastPerformanceByExerciseId] = useState<
    Record<string, WorkoutSet | undefined>
  >({})
  const startedTemplateIdRef = useRef<string | null>(null)
  // Debounced metadata save: flushes on blur, complete, and unmount.
  const metadataSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const metadataSaveFnRef = useRef<(() => void) | null>(null)

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
    setSaveStatus('idle')
    setCommandStatus('idle')
    setCommandError(null)
    setLastPerformanceByExerciseId({})
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

  const loadLastPerformanceDefaults = useCallback(
    async (exerciseId: string) => {
      try {
        const [lastSet] = await loadWorkoutSetHistory(exerciseId, 1)
        if (!lastSet) return

        setLastPerformanceByExerciseId((current) => ({
          ...current,
          [exerciseId]: mapHistoryItemToWorkoutSet(exerciseId, lastSet),
        }))
      } catch (error) {
        console.error('Failed to load last performance defaults:', error)
      }
    },
    [mapHistoryItemToWorkoutSet],
  )

  const loadSessionData = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true)
        beginCommand()
        const workout = await loadWorkoutSessionDetails(sessionId)

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
        finishCommand()
      } catch (error) {
        console.error('Failed to load session data:', error)
        failCommand(error, 'Failed to load workout session')
        setExercises([])
      } finally {
        setLoading(false)
      }
    },
    [beginCommand, failCommand, finishCommand],
  )

  useEffect(() => {
    if (!existingSessionId) {
      resetSession()
      return
    }

    setSession({
      id: existingSessionId,
      user_id: existingSessionUserId || '',
      name: existingSessionName,
      date: existingSessionDate || todayString(),
      notes: existingSessionNotes,
      start_time: existingSessionStartTime || nowISOString(),
      end_time: existingSessionEndTime,
      created_at: new Date(),
      updated_at: new Date(),
    })
    setSessionName(existingSessionName || '')
    setSessionNotes(existingSessionNotes || '')
    setSessionLocation(existingSessionLocation || '')
    setSessionDate(existingSessionDate || todayString())
    setSessionStartTime(existingSessionStartTime || nowISOString())
    void loadSessionData(existingSessionId)
  }, [
    existingSessionDate,
    existingSessionEndTime,
    existingSessionLocation,
    existingSessionName,
    existingSessionNotes,
    existingSessionStartTime,
    existingSessionId,
    existingSessionUserId,
    loadSessionData,
    resetSession,
  ])

  const startSession = useCallback(async () => {
    try {
      setLoading(true)
      beginCommand()

      const sessionData: WorkoutSessionWriteInput = {
        name: sessionName.trim() || undefined,
        date: sessionDate,
        notes: sessionNotes.trim() || undefined,
        start_time: sessionStartTime,
        location_name: sessionLocation.trim() || undefined,
      }

      const newSession = await createWorkoutSession(sessionData)
      setSession(newSession)
      onSessionSave?.(newSession)
      finishCommand()
    } catch (error) {
      console.error('Failed to start session:', error)
      failCommand(error, 'Failed to start workout session')
    } finally {
      setLoading(false)
    }
  }, [
    beginCommand,
    failCommand,
    finishCommand,
    onSessionSave,
    sessionDate,
    sessionLocation,
    sessionName,
    sessionNotes,
    sessionStartTime,
  ])

  const startSessionFromTemplate = useCallback(
    async (templateId: string) => {
      try {
        setLoading(true)
        beginCommand()
        const result = await startWorkoutSessionFromTemplate(templateId)
        const plannedExercises = mapWorkoutTemplateToExercises(result.template)

        setSession(result.session)
        setSessionName(result.session.name || '')
        setSessionNotes(result.session.notes || '')
        setSessionLocation(result.session.location_name || '')
        setSessionDate(result.session.date)
        setSessionStartTime(result.session.start_time)
        setExercises(plannedExercises)
        setActiveExerciseId(getActiveExerciseId(plannedExercises, null))
        onSessionSave?.(result.session)
        finishCommand()
      } catch (error) {
        console.error('Failed to start workout from template:', error)
        failCommand(error, 'Failed to start workout from template')
      } finally {
        setLoading(false)
      }
    },
    [beginCommand, failCommand, finishCommand, onSessionSave],
  )

  useEffect(() => {
    if (!initialTemplateId || existingSessionId || session?.id) return
    if (startedTemplateIdRef.current === initialTemplateId) return
    startedTemplateIdRef.current = initialTemplateId
    void startSessionFromTemplate(initialTemplateId)
  }, [existingSessionId, initialTemplateId, session?.id, startSessionFromTemplate])

  const saveSession = useCallback(async () => {
    if (!session) return

    if (!sessionDate || Number.isNaN(Date.parse(sessionDate))) {
      setSaveStatus('error')
      setCommandStatus('error')
      setCommandError('Choose a valid workout date before saving.')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    setSaveStatus('saving')
    beginCommand()

    try {
      const locationValue = sessionLocation.trim()
      const updatedSession = await updateWorkoutSession(session.id, {
        name: sessionName.trim(),
        notes: sessionNotes.trim(),
        date: sessionDate,
        location_name: locationValue === '' ? null : locationValue,
      })

      setSession(updatedSession)
      onSessionSave?.(updatedSession)
      setSaveStatus('saved')
      finishCommand()
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (error) {
      console.error('Failed to update session:', error)
      setSaveStatus('error')
      failCommand(error, 'Failed to update workout session')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [
    beginCommand,
    failCommand,
    finishCommand,
    onSessionSave,
    session,
    sessionDate,
    sessionLocation,
    sessionName,
    sessionNotes,
  ])

  // Keep the save fn ref up-to-date so the debounce timer always calls the
  // latest closure (avoids stale sessionName/notes/location).
  useEffect(() => {
    metadataSaveFnRef.current = () => {
      void saveSession()
    }
  }, [saveSession])

  const scheduleMetadataSave = useCallback((delayMs = 1500) => {
    if (metadataSaveTimerRef.current) clearTimeout(metadataSaveTimerRef.current)
    metadataSaveTimerRef.current = setTimeout(() => {
      metadataSaveFnRef.current?.()
      metadataSaveTimerRef.current = null
    }, delayMs)
  }, [])

  const flushMetadataSave = useCallback(() => {
    if (metadataSaveTimerRef.current) {
      clearTimeout(metadataSaveTimerRef.current)
      metadataSaveTimerRef.current = null
      metadataSaveFnRef.current?.()
    }
  }, [])

  // Cancel pending timer on unmount to prevent saving to a deleted session.
  useEffect(() => {
    return () => {
      if (metadataSaveTimerRef.current) clearTimeout(metadataSaveTimerRef.current)
    }
  }, [])

  const completeSession = useCallback(async () => {
    if (!session) return

    try {
      setLoading(true)
      beginCommand()
      // Flush any pending metadata save before marking the session complete.
      // Must await — completeWorkoutSession must not race the PATCH for metadata.
      if (metadataSaveTimerRef.current) {
        clearTimeout(metadataSaveTimerRef.current)
        metadataSaveTimerRef.current = null
        await saveSession()
      }
      const completedSession = await completeWorkoutSession(session.id)
      setSession(completedSession)
      onSessionComplete?.(completedSession)
      finishCommand()
    } catch (error) {
      console.error('Failed to complete session:', error)
      failCommand(error, 'Failed to complete workout session')
    } finally {
      setLoading(false)
    }
  }, [beginCommand, failCommand, finishCommand, onSessionComplete, saveSession, session])

  const deleteSession = useCallback(async () => {
    if (!session) return false

    try {
      setLoading(true)
      beginCommand()
      await deleteWorkoutSession(session.id)

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
    } finally {
      setLoading(false)
    }
  }, [beginCommand, failCommand, finishCommand, onSessionDelete, resetSession, session])

  const addExercise = useCallback(
    (exercise: ExerciseWithParsedFields) => {
      if (hasExerciseInWorkout(exercises, exercise.id)) {
        setCommandStatus('error')
        setCommandError('This exercise is already in your workout.')
        setSelectedExercise(null)
        return
      }

      setExercises((currentExercises) => {
        const result = addExerciseToWorkout(currentExercises, exercise)

        setCommandStatus('success')
        setCommandError(null)
        setActiveExerciseId(exercise.id)
        return result.exercises
      })

      void loadLastPerformanceDefaults(exercise.id)
      setSelectedExercise(null)
    },
    [exercises, loadLastPerformanceDefaults],
  )

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      try {
        if (session?.id) {
          beginCommand()
          await removeExerciseSets(session.id, exerciseId)
        }

        setExercises((currentExercises) => {
          const nextExercises = removeExerciseFromWorkout(currentExercises, exerciseId)
          setActiveExerciseId((currentActiveExerciseId) =>
            getActiveExerciseId(
              nextExercises,
              currentActiveExerciseId === exerciseId ? null : currentActiveExerciseId,
            ),
          )
          return nextExercises
        })
        finishCommand()
        return true
      } catch (error) {
        console.error('Failed to remove exercise:', error)
        failCommand(error, 'Failed to remove exercise')
        return false
      }
    },
    [beginCommand, failCommand, finishCommand, session?.id],
  )

  const saveSet = useCallback(
    async (exerciseId: string, setData: WorkoutSetInput): Promise<WorkoutSet | null> => {
      if (!session) return null

      try {
        beginCommand()
        const newSet = await createWorkoutSet(setData)
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
    [beginCommand, failCommand, finishCommand, session],
  )

  const updateSet = useCallback(
    async (
      exerciseId: string,
      setId: string,
      setData: WorkoutSetInput,
    ): Promise<WorkoutSet | null> => {
      try {
        beginCommand()
        const updatedSet = await updateWorkoutSet(setId, setData)
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
    [beginCommand, failCommand, finishCommand],
  )

  const deleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      try {
        beginCommand()
        await deleteWorkoutSet(setId)
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
    [beginCommand, failCommand, finishCommand],
  )

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
    setSessionDate,
    setSessionStartTime,
    scheduleMetadataSave,
    flushMetadataSave,
    actions: {
      startSession,
      startSessionFromTemplate,
      saveSession,
      completeSession,
      deleteSession,
      addExercise,
      selectActiveExercise: setActiveExerciseId,
      removeExercise,
      saveSet,
      updateSet,
      deleteSet,
      getNextSetNumber,
      clearCommandError,
    },
  }
}
