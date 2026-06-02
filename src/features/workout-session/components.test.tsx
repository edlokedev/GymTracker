import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutWithDetails,
} from '@/lib/types/database'
import { makeExerciseFixture } from './__fixtures__/exercise'
import WorkoutSessionManager from './components/WorkoutSessionManager'

const selectorExercise = vi.hoisted<() => ExerciseWithParsedFields>(() => () => ({
  id: 'bench-press',
  name: 'Bench Press',
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
}))

vi.mock('@/features/exercise-library/components/ExerciseSelector', () => ({
  default: ({
    onSelectExercise,
  }: {
    onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  }) => (
    <button type="button" onClick={() => onSelectExercise(selectorExercise())}>
      Select mocked exercise
    </button>
  ),
}))

vi.mock('@/features/exercise-library/components/ExerciseHistory', () => ({
  ExerciseHistory: () => <div>Mock exercise history</div>,
}))

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session-1',
  user_id: 'user-1',
  name: 'Push Day',
  date: '2026-05-01',
  start_time: '2026-05-01T10:00:00.000Z',
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
  ...overrides,
})

const makeWorkoutDetails = ({
  includeSecondExercise = false,
  includeCrowdedRail = false,
} = {}): WorkoutWithDetails => ({
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
      sets: [
        {
          id: 'set-1',
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_number: 1,
          reps: 8,
          weight: 100,
          created_at: new Date('2026-05-01T10:00:00.000Z'),
          updated_at: new Date('2026-05-01T10:00:00.000Z'),
        },
      ],
    },
    ...(includeSecondExercise
      ? [
          {
            exercise: makeExerciseFixture({
              id: 'squat',
              name: 'Squat',
              primary_muscles: ['quadriceps'],
              equipment: 'barbell',
              category_name: 'Strength',
              gif_path: null,
              preview_image_path: null,
            }),
            sets: [
              {
                id: 'set-2',
                workout_id: 'session-1',
                exercise_id: 'squat',
                set_number: 1,
                reps: 5,
                weight: 120,
                created_at: new Date('2026-05-01T10:00:00.000Z'),
                updated_at: new Date('2026-05-01T10:00:00.000Z'),
              },
            ],
          },
        ]
      : []),
    ...(includeCrowdedRail
      ? [
          {
            exercise: makeExerciseFixture({
              id: 'deadlift',
              name: 'Deadlift',
              primary_muscles: ['back'],
              equipment: 'barbell',
              category_name: 'Strength',
              gif_path: null,
              preview_image_path: null,
            }),
            sets: [],
          },
          {
            exercise: makeExerciseFixture({
              id: 'overhead-press',
              name: 'Overhead Press',
              primary_muscles: ['shoulders'],
              equipment: 'barbell',
              category_name: 'Strength',
              gif_path: null,
              preview_image_path: null,
            }),
            sets: [],
          },
        ]
      : []),
  ],
})

describe('WorkoutSessionManager', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('starts a new workout session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true, data: makeSession() })),
    )

    render(<WorkoutSessionManager />)

    expect(screen.queryByText('New Workout')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }))

    await waitFor(() => expect(screen.getByText('Active Workout')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Add Exercise' })).toBeInTheDocument()
  })

  it('renders workout command errors through inline error UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: false, error: 'Unable to start workout' }, { status: 500 }),
      ),
    )

    render(<WorkoutSessionManager />)

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to start workout'),
    )
  })

  it('renders an existing workout with exercises and sets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true, data: makeWorkoutDetails() })),
    )

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )
    expect(screen.getByText('Set 1')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('lets a logged exercise be marked done and resumed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true, data: makeWorkoutDetails() })),
    )

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )
    expect(screen.getByText('Set 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark Bench Press done' }))

    expect(screen.getByText('Exercise done')).toBeInTheDocument()
    expect(screen.getByText('Ready for the next exercise.')).toBeInTheDocument()
    expect(screen.queryByText('Set 2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resume Bench Press' }))

    expect(screen.getByText('Set 2')).toBeInTheDocument()
  })

  it('shows a mobile exercise rail and switches the active exercise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, data: makeWorkoutDetails({ includeSecondExercise: true }) }),
      ),
    )

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )

    const rail = screen.getByRole('navigation', { name: 'Workout exercises' })
    const benchButton = screen.getByRole('button', { name: /Bench Press, 1 sets/i })
    const squatButton = screen.getByRole('button', { name: /Squat, 1 sets/i })
    expect(rail).toContainElement(benchButton)
    expect(rail).not.toHaveClass('-mx-4')
    expect(rail).toHaveClass('max-w-full')
    expect(rail).toHaveClass('scrollbar-none')
    expect(rail).toHaveClass('flex')
    expect(rail).not.toHaveClass('grid-rows-2')
    expect(screen.queryByRole('button', { name: '+ Exercise' })).not.toBeInTheDocument()
    expect(benchButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(squatButton)

    expect(squatButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
  })

  it('uses two rail rows only when exercises are crowded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          success: true,
          data: makeWorkoutDetails({ includeSecondExercise: true, includeCrowdedRail: true }),
        }),
      ),
    )

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )

    const rail = screen.getByRole('navigation', { name: 'Workout exercises' })
    expect(rail).toHaveClass('grid-rows-2')
    expect(rail).toHaveClass('grid-flow-col')
    expect(rail).not.toHaveClass('flex')
  })

  it('keeps a single-exercise rail compact', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true, data: makeWorkoutDetails() })),
    )

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )

    const rail = screen.getByRole('navigation', { name: 'Workout exercises' })
    expect(rail).toHaveClass('flex')
    expect(rail).not.toHaveClass('grid-rows-2')
  })

  it('mobile sticky action saves the active prefilled set', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({ success: true, data: makeWorkoutDetails() })
      }

      if (url === '/api/workout-sets' && init?.method === 'POST') {
        return Response.json({
          success: true,
          data: {
            id: 'set-2',
            workout_id: 'session-1',
            exercise_id: 'bench-press',
            set_number: 2,
            reps: 8,
            weight: 100,
            created_at: new Date('2026-05-01T10:00:00.000Z'),
            updated_at: new Date('2026-05-01T10:00:00.000Z'),
          },
        })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Save Set' }).length).toBeGreaterThan(0),
    )

    const saveButtons = screen.getAllByRole('button', { name: 'Save Set' })
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workout-sets',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const [, saveRequest] = fetchMock.mock.calls.find(
      ([input, init]) => String(input) === '/api/workout-sets' && init?.method === 'POST',
    ) as [RequestInfo | URL, RequestInit]
    expect(JSON.parse(String(saveRequest.body))).toEqual({
      workout_id: 'session-1',
      exercise_id: 'bench-press',
      set_order: 2,
      reps: 8,
      weight: 100,
    })
  })

  it('mobile sticky done action completes the active exercise, not the workout', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({ success: true, data: makeWorkoutDetails() })
      }

      if (url.includes('action=complete')) {
        throw new Error('Workout completion should not run from Done Exercise')
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Done Exercise' }))

    expect(screen.getByText('Exercise done')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('action=complete'),
      expect.anything(),
    )
  })

  it('confirms exercise removal before calling the remove action', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({ success: true, data: makeWorkoutDetails() })
      }

      if (url.includes('workoutId=session-1') && init?.method === 'DELETE') {
        return Response.json({ success: true, data: { deletedCount: 1 } })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WorkoutSessionManager existingSession={makeSession()} />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bench Press' }))
    await waitFor(() => expect(screen.getByText(/remove "Bench Press"/i)).toBeInTheDocument())
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    const confirmRemoveButton = removeButtons[removeButtons.length - 1]
    if (!confirmRemoveButton) {
      throw new Error('Expected remove confirmation button')
    }
    fireEvent.click(confirmRemoveButton)

    await waitFor(() => expect(screen.queryByText('Bench Press')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workout-sets?workoutId=session-1&exerciseId=bench-press',
      { method: 'DELETE' },
    )
  })

  it('confirms workout deletion before calling the delete callback', async () => {
    const onSessionDelete = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('includeDetails=true')) {
        return Response.json({
          success: true,
          data: { ...makeSession(), exercises: [] },
        })
      }

      if (url.includes('/api/workout-sessions?id=session-1') && init?.method === 'DELETE') {
        return Response.json({ success: true, data: { id: 'session-1' } })
      }

      throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkoutSessionManager existingSession={makeSession()} onSessionDelete={onSessionDelete} />,
    )

    await waitFor(() => expect(screen.getByText('Active Workout')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Delete workout'))
    await waitFor(() =>
      expect(screen.getByText(/permanently remove the workout/i)).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workout' }))

    await waitFor(() => expect(onSessionDelete).toHaveBeenCalledWith('session-1'))
  })
})
