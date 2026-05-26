import { useCallback, useEffect, useMemo, useState } from 'react'
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
  removeExerciseSets,
  updateWorkoutSession,
  updateWorkoutSet,
  type WorkoutSessionWriteInput,
} from './client'
import {
  addExerciseToWorkout,
  appendSetToExercise,
  type ExerciseInWorkout,
  getNextSetNumber,
  getSessionDuration,
  getTotalSets,
  getTotalVolume,
  mapWorkoutDetailsToExercises,
  removeExerciseFromWorkout,
  removeSetFromExercise,
  replaceSetInExercise,
  type SaveStatus,
} from './model'

type WorkoutCommandStatus = 'idle' | 'running' | 'success' | 'error'

interface UseWorkoutSessionOptions {
  existingSession?: WorkoutSession
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
  const [session, setSession] = useState<WorkoutSession | null>(existingSession || null)
  const [exercises, setExercises] = useState<ExerciseInWorkout[]>([])
  const [sessionName, setSessionName] = useState(existingSession?.name || '')
  const [sessionNotes, setSessionNotes] = useState(existingSession?.notes || '')
  const [sessionDate, setSessionDate] = useState(existingSession?.date || todayString())
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithParsedFields | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState(
    existingSession?.start_time || nowISOString(),
  )
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [commandStatus, setCommandStatus] = useState<WorkoutCommandStatus>('idle')
  const [commandError, setCommandError] = useState<string | null>(null)

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
    setSessionDate(todayString())
    setSelectedExercise(null)
    setSessionStartTime(nowISOString())
    setSaveStatus('idle')
    setCommandStatus('idle')
    setCommandError(null)
  }, [])

  const loadSessionData = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true)
        beginCommand()
        const workout = await loadWorkoutSessionDetails(sessionId)

        setSession(workout)
        setSessionName(workout.name || '')
        setSessionNotes(workout.notes || '')
        setSessionDate(workout.date)
        setSessionStartTime(workout.start_time)
        setExercises(mapWorkoutDetailsToExercises(workout))
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
    setSessionDate(existingSessionDate || todayString())
    setSessionStartTime(existingSessionStartTime || nowISOString())
    void loadSessionData(existingSessionId)
  }, [
    existingSessionDate,
    existingSessionEndTime,
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
    sessionName,
    sessionNotes,
    sessionStartTime,
  ])

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
      const updatedSession = await updateWorkoutSession(session.id, {
        name: sessionName.trim(),
        notes: sessionNotes.trim(),
        date: sessionDate,
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
    sessionName,
    sessionNotes,
  ])

  const completeSession = useCallback(async () => {
    if (!session) return

    try {
      setLoading(true)
      beginCommand()
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
  }, [beginCommand, failCommand, finishCommand, onSessionComplete, session])

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

  const addExercise = useCallback((exercise: ExerciseWithParsedFields) => {
    setExercises((currentExercises) => {
      const result = addExerciseToWorkout(currentExercises, exercise)

      if (!result.added) {
        setCommandStatus('error')
        setCommandError('This exercise is already in your workout.')
        return currentExercises
      }

      setCommandStatus('success')
      setCommandError(null)
      return result.exercises
    })
    setSelectedExercise(null)
  }, [])

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      try {
        if (session?.id) {
          beginCommand()
          await removeExerciseSets(session.id, exerciseId)
        }

        setExercises((currentExercises) => removeExerciseFromWorkout(currentExercises, exerciseId))
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

  return {
    session,
    exercises,
    sessionName,
    sessionNotes,
    sessionDate,
    selectedExercise,
    sessionStartTime,
    isSessionStarted: Boolean(session),
    loading,
    saveStatus,
    commandStatus,
    commandError,
    totalSets,
    totalVolume,
    sessionDuration,
    setSessionName,
    setSessionNotes,
    setSessionDate,
    setSessionStartTime,
    actions: {
      startSession,
      saveSession,
      completeSession,
      deleteSession,
      addExercise,
      removeExercise,
      saveSet,
      updateSet,
      deleteSet,
      getNextSetNumber,
      clearCommandError,
    },
  }
}
