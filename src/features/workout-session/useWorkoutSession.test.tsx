import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplateWithExercises,
  WorkoutWithDetails,
} from '@/lib/types/database'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { makeExerciseFixture } from './__fixtures__/exercise'
import { useWorkoutSession } from './useWorkoutSession'

// Every useWorkoutSession render wraps in a fresh QueryClient (ADR-0007, Phase
// 4) — the hook bootstraps via useQuery and prefills via fetchQuery.
function renderWorkoutSession(props: Parameters<typeof useWorkoutSession>[0]) {
  const { wrapper } = createQueryWrapper()
  return renderHook(() => useWorkoutSession(props), { wrapper })
}

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

const makeWorkoutTemplate = (): WorkoutTemplateWithExercises => ({
  id: 'template-1',
  user_id: 'user-1',
  name: 'Push Plan',
  is_archived: false,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
  exercises: [
    {
      templateExercise: {
        id: 'template-exercise-1',
        template_id: 'template-1',
        exercise_id: 'bench-press',
        position: 1,
        target_sets: 3,
        created_at: new Date('2026-05-01T10:00:00.000Z'),
      },
      exercise: makeExercise('bench-press'),
    },
    {
      templateExercise: {
        id: 'template-exercise-2',
        template_id: 'template-1',
        exercise_id: 'squat',
        position: 2,
        target_sets: 3,
        created_at: new Date('2026-05-01T10:00:00.000Z'),
      },
      exercise: makeExercise('squat'),
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

    const { result } = renderWorkoutSession({ existingSession: makeSession() })

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

    const { result } = renderWorkoutSession({ onSessionSave })

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

  it('starts from a saved workout with planned exercises intact', async () => {
    const onSessionSave = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('action=startFromTemplate') && init?.method === 'POST') {
        return Response.json({
          success: true,
          data: {
            session: makeSession({ id: 'template-session', name: 'Push Plan' }),
            template: makeWorkoutTemplate(),
          },
        })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderWorkoutSession({ initialTemplateId: 'template-1', onSessionSave })

    await waitFor(() => expect(result.current.session?.id).toBe('template-session'))

    expect(result.current.exercises.map((item) => item.exercise.id)).toEqual([
      'bench-press',
      'squat',
    ])
    expect(result.current.exercises.every((item) => item.sets.length === 0)).toBe(true)
    expect(result.current.activeExerciseId).toBe('bench-press')
    expect(result.current.totalSets).toBe(0)
    expect(onSessionSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'template-session' }))
  })

  it('prefills last-performance defaults for saved-workout (template) exercises', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('action=startFromTemplate') && init?.method === 'POST') {
        return Response.json({
          success: true,
          data: {
            session: makeSession({ id: 'template-session', name: 'Push Plan' }),
            template: makeWorkoutTemplate(),
          },
        })
      }

      if (url.includes('action=history')) {
        const exerciseId = new URL(url, 'http://test').searchParams.get('exerciseId')
        return Response.json({
          success: true,
          data: [
            {
              id: `hist-${exerciseId}`,
              set_number: 1,
              reps: 5,
              weight: 60,
              session_date: '2026-05-30',
              session_name: 'Push Day',
            },
          ],
        })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderWorkoutSession({ initialTemplateId: 'template-1' })

    await waitFor(() => expect(result.current.session?.id).toBe('template-session'))

    // Both template exercises get last-performance prefill, like manual add.
    await waitFor(() => {
      expect(result.current.lastPerformanceByExerciseId['bench-press']).toMatchObject({
        reps: 5,
        weight: 60,
      })
      expect(result.current.lastPerformanceByExerciseId.squat).toMatchObject({
        reps: 5,
        weight: 60,
      })
    })
  })

  it('returns command errors instead of alerting when start fails', async () => {
    const alertMock = vi.fn()
    const fetchMock = vi.fn(async () =>
      Response.json({ success: false, error: 'Start failed upstream' }, { status: 500 }),
    )
    vi.stubGlobal('alert', alertMock)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderWorkoutSession({})

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

    const { result } = renderWorkoutSession({
      existingSession: makeSession(),
      onSessionSave,
    })

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

    const { result } = renderWorkoutSession({ existingSession: makeSession() })

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

    const { result } = renderWorkoutSession({ existingSession: makeSession() })

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

    const { result } = renderWorkoutSession({
      existingSession: makeSession(),
      onSessionComplete,
      onSessionDelete,
    })

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

  // --- Phase 4 regression pins (ADR-0007) ---

  // Prefill race: two sessions loaded in quick succession must each resolve to
  // their own exercises' last-performance. TanStack Query keys history by
  // exercise id, so a late-arriving prefill can only ever be the correct value
  // for that exercise — this replaces the retired `prefillRequestRef` token.
  // RED: keying the prefill merge by anything other than exercise id (or reading
  // a shared mutable token) would let session A's in-flight prefill overwrite
  // session B's map.
  it('resolves last-performance prefill per exercise across a rapid session switch', async () => {
    const historyByExercise: Record<string, { reps: number; weight: number }> = {
      'bench-press': { reps: 5, weight: 60 },
      squat: { reps: 3, weight: 100 },
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('includeDetails=true')) {
        const id = new URL(url, 'http://test').searchParams.get('id')
        // session-1 has bench-press (no sets), session-2 has squat (no sets).
        const exerciseId = id === 'session-2' ? 'squat' : 'bench-press'
        return Response.json({
          success: true,
          data: {
            ...makeSession({ id: id ?? 'session-1' }),
            exercises: [{ exercise: makeExercise(exerciseId), sets: [] }],
          },
        })
      }
      if (url.includes('action=history')) {
        const exerciseId = new URL(url, 'http://test').searchParams.get('exerciseId') ?? ''
        const hist = historyByExercise[exerciseId]
        return Response.json({
          success: true,
          data: hist
            ? [
                {
                  id: `hist-${exerciseId}`,
                  set_number: 1,
                  reps: hist.reps,
                  weight: hist.weight,
                  session_date: '2026-05-30',
                  session_name: 'Prev',
                },
              ]
            : [],
        })
      }
      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = createQueryWrapper()
    const { result, rerender } = renderHook(
      ({ session }: { session: WorkoutSession }) => useWorkoutSession({ existingSession: session }),
      { wrapper, initialProps: { session: makeSession({ id: 'session-1' }) } },
    )

    await waitFor(() =>
      expect(result.current.lastPerformanceByExerciseId['bench-press']).toMatchObject({
        reps: 5,
        weight: 60,
      }),
    )

    rerender({ session: makeSession({ id: 'session-2' }) })

    await waitFor(() =>
      expect(result.current.lastPerformanceByExerciseId.squat).toMatchObject({
        reps: 3,
        weight: 100,
      }),
    )
    // The bench-press prefill from session-1 is keyed by exercise id, so it is
    // never mis-attributed to squat.
    expect(result.current.lastPerformanceByExerciseId.squat?.reps).toBe(3)
  })

  // Updater-side-effect fix (#0011): addExercise computes the next value first,
  // sets state, then runs its effects — no setters called from inside the
  // setExercises updater. This exercises the fixed path under StrictMode's
  // double-invoked render and pins the resulting state (active exercise +
  // command status) so a regression back to the in-updater pattern is caught.
  it('adds an exercise without updating state inside the updater under StrictMode', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('includeDetails=true')) {
        return Response.json({ success: true, data: { ...makeSession(), exercises: [] } })
      }
      if (url.includes('action=history')) {
        return Response.json({ success: true, data: [] })
      }
      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useWorkoutSession({ existingSession: makeSession() }), {
      wrapper: ({ children }) => <StrictMode>{wrapper({ children })}</StrictMode>,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.actions.addExercise(makeExercise('bench-press'))
    })

    await waitFor(() => expect(result.current.exercises).toHaveLength(1))
    expect(result.current.activeExerciseId).toBe('bench-press')
    expect(result.current.commandStatus).toBe('success')
    // No "update a component while rendering" warning — the updater stayed pure.
    const badUpdateWarnings = consoleError.mock.calls.filter((call) =>
      String(call[0]).includes('while rendering a different component'),
    )
    expect(badUpdateWarnings).toHaveLength(0)
  })

  // Optimistic/pending save state: while the metadata save PATCH is in flight,
  // saveStatus reflects the mutation's isPending as 'saving'; on success it
  // settles to the lingering 'saved'. RED: deriving saveStatus from a plain
  // boolean set before/after the await (the old model) can't distinguish an
  // in-flight save from an idle hook the way mutation.isPending does.
  it('exposes pending then saved save-status through the mutation lifecycle', async () => {
    let releaseSave: (() => void) | null = null
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('includeDetails=true')) {
        return Response.json({ success: true, data: { ...makeSession(), exercises: [] } })
      }
      if (init?.method === 'PATCH') {
        await new Promise<void>((resolve) => {
          releaseSave = resolve
        })
        return Response.json({ success: true, data: makeSession({ name: 'Pull Day' }) })
      }
      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderWorkoutSession({ existingSession: makeSession() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    let savePromise: Promise<void>
    act(() => {
      result.current.setSessionName('Pull Day')
      savePromise = result.current.actions.saveSession()
    })

    // In flight → 'saving'.
    await waitFor(() => expect(result.current.saveStatus).toBe('saving'))

    await act(async () => {
      releaseSave?.()
      await savePromise
    })

    // Settled → lingering 'saved'.
    expect(result.current.saveStatus).toBe('saved')
  })
})
