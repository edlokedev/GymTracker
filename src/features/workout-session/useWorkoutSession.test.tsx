import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutSet,
  WorkoutWithDetails,
} from '@/lib/types/database'
import { makeExerciseFixture } from './__fixtures__/exercise'
import { useWorkoutSession } from './useWorkoutSession'

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session-1',
  user_id: 'user-1',
  name: 'Push Day',
  date: '2026-05-01',
  start_time: '2026-05-01T10:00:00.000Z',
  notes: 'Good day',
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
  ...overrides,
})

const makeSet = (id: string, setNumber: number): WorkoutSet => ({
  id,
  workout_id: 'session-1',
  exercise_id: 'bench-press',
  set_number: setNumber,
  reps: 8,
  weight: 100,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
})

const makeExercise = (id = 'bench-press'): ExerciseWithParsedFields => ({
  id,
  name: id === 'bench-press' ? 'Bench Press' : 'Squat',
  category_id: 'strength',
  category_name: 'Strength',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  gif_path: null,
  preview_image_path: null,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
})

const makeWorkoutDetails = (): WorkoutWithDetails => ({
  ...makeSession(),
  exercises: [
    {
      exercise: makeExerciseFixture({
        id: 'bench-press',
        name: 'Bench Press',
        primary_muscles: ['chest'],
        equipment: 'barbell',
        category_name: 'Strength',
        gif_path: null,
        preview_image_path: null,
      }),
      sets: [makeSet('set-1', 1)],
    },
  ],
})

describe('useWorkoutSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads existing workout details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true, data: makeWorkoutDetails() })),
    )

    const { result } = renderHook(() => useWorkoutSession({ existingSession: makeSession() }))

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))

    expect(result.current.session?.id).toBe('session-1')
    expect(result.current.sessionName).toBe('Push Day')
    expect(result.current.exercises[0].sets).toHaveLength(1)
    expect(result.current.totalSets).toBe(1)
    expect(result.current.totalVolume).toBe(800)
    expect(result.current.activeExerciseId).toBe('bench-press')
  })

  it('starts a new session and calls onSessionSave', async () => {
    const onSessionSave = vi.fn()
    const fetchMock = vi.fn(async () => Response.json({ success: true, data: makeSession() }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWorkoutSession({ onSessionSave }))

    await act(async () => {
      result.current.setSessionName('Push Day')
      await result.current.actions.startSession()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workout-sessions',
      expect.objectContaining({ method: 'POST' }),
    )
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).not.toHaveProperty('user_id')
    expect(result.current.session?.id).toBe('session-1')
    expect(result.current.commandStatus).toBe('success')
    expect(result.current.commandError).toBeNull()
    expect(onSessionSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-1' }))
  })

  it('returns command errors instead of alerting when start fails', async () => {
    const alertMock = vi.fn()
    const fetchMock = vi.fn(async () =>
      Response.json({ success: false, error: 'Start failed upstream' }, { status: 500 }),
    )
    vi.stubGlobal('alert', alertMock)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWorkoutSession({}))

    await act(async () => {
      await result.current.actions.startSession()
    })

    expect(alertMock).not.toHaveBeenCalled()
    expect(result.current.commandStatus).toBe('error')
    expect(result.current.commandError).toBe('Start failed upstream')
    expect(result.current.session).toBeNull()
  })

  it('updates session fields and save status', async () => {
    const onSessionSave = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({
          success: true,
          data: { ...makeSession(), exercises: [] },
        })
      }

      if (url.includes('action=history')) {
        return Response.json({ success: true, data: [] })
      }

      if (init?.method === 'PATCH') {
        return Response.json({
          success: true,
          data: makeSession({ name: 'Pull Day' }),
        })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useWorkoutSession({
        existingSession: makeSession(),
        onSessionSave,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.setSessionName('Pull Day')
      await result.current.actions.saveSession()
    })

    expect(result.current.saveStatus).toBe('saved')
    expect(onSessionSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pull Day' }))
  })

  it('adds/removes exercises and mutates sets', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({
          success: true,
          data: { ...makeSession(), exercises: [] },
        })
      }

      if (url === '/api/workout-sets' && init?.method === 'POST') {
        return Response.json({ success: true, data: makeSet('set-1', 1) })
      }

      if (url.includes('/api/workout-sets?id=set-1') && init?.method === 'PUT') {
        return Response.json({
          success: true,
          data: { ...makeSet('set-1', 1), reps: 10 },
        })
      }

      if (url.includes('/api/workout-sets?id=set-1') && init?.method === 'DELETE') {
        return Response.json({ success: true })
      }

      if (url.includes('workoutId=session-1') && init?.method === 'DELETE') {
        return Response.json({ success: true, data: { deletedCount: 0 } })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWorkoutSession({ existingSession: makeSession() }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.actions.addExercise(makeExercise())
    })
    expect(result.current.exercises).toHaveLength(1)
    expect(result.current.activeExerciseId).toBe('bench-press')

    act(() => {
      result.current.actions.addExercise(makeExercise('squat'))
    })
    expect(result.current.exercises).toHaveLength(2)
    expect(result.current.activeExerciseId).toBe('squat')

    act(() => {
      result.current.actions.selectActiveExercise('bench-press')
    })
    expect(result.current.activeExerciseId).toBe('bench-press')

    act(() => {
      result.current.actions.addExercise(makeExercise())
    })
    expect(result.current.exercises).toHaveLength(2)
    expect(result.current.commandStatus).toBe('error')
    expect(result.current.commandError).toBe('This exercise is already in your workout.')

    await act(async () => {
      await result.current.actions.saveSet('bench-press', {
        workout_id: 'session-1',
        exercise_id: 'bench-press',
        set_order: 1,
        reps: 8,
        weight: 100,
      })
    })
    expect(result.current.exercises[0].sets).toHaveLength(1)

    await act(async () => {
      await result.current.actions.updateSet('bench-press', 'set-1', {
        workout_id: 'session-1',
        exercise_id: 'bench-press',
        set_order: 1,
        reps: 10,
      })
    })
    expect(result.current.exercises[0].sets[0].reps).toBe(10)

    await act(async () => {
      await result.current.actions.deleteSet('bench-press', 'set-1')
    })
    expect(result.current.exercises[0].sets).toHaveLength(0)

    await act(async () => {
      await result.current.actions.removeExercise('bench-press')
    })
    expect(result.current.exercises).toHaveLength(1)
    expect(result.current.activeExerciseId).toBe('squat')
  })

  it('loads latest performance defaults when adding an exercise', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({
          success: true,
          data: { ...makeSession(), exercises: [] },
        })
      }

      if (url.includes('action=history') && url.includes('exerciseId=bench-press')) {
        return Response.json({
          success: true,
          data: [
            {
              id: 'hist-set-1',
              set_number: 1,
              reps: 6,
              weight: 42.5,
              session_date: '2026-05-30',
              session_name: 'Push Day',
            },
          ],
        })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWorkoutSession({ existingSession: makeSession() }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.actions.addExercise(makeExercise())
    })

    await waitFor(() =>
      expect(result.current.lastPerformanceByExerciseId['bench-press']).toMatchObject({
        id: 'hist-set-1',
        exercise_id: 'bench-press',
        set_number: 1,
        reps: 6,
        weight: 42.5,
      }),
    )
  })

  it('completes and deletes sessions through callbacks', async () => {
    const onSessionComplete = vi.fn()
    const onSessionDelete = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({
          success: true,
          data: { ...makeSession(), exercises: [] },
        })
      }

      if (url.includes('action=complete') && init?.method === 'PATCH') {
        return Response.json({
          success: true,
          data: makeSession({ end_time: '2026-05-01T11:00:00.000Z' }),
        })
      }

      if (url.includes('/api/workout-sessions?id=session-1') && init?.method === 'DELETE') {
        return Response.json({ success: true, data: { id: 'session-1' } })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useWorkoutSession({
        existingSession: makeSession(),
        onSessionComplete,
        onSessionDelete,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.actions.completeSession()
    })
    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ end_time: '2026-05-01T11:00:00.000Z' }),
    )

    await act(async () => {
      await result.current.actions.deleteSession()
    })
    expect(onSessionDelete).toHaveBeenCalledWith('session-1')
  })
})
