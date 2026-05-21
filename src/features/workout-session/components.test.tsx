import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields, WorkoutSession, WorkoutWithDetails } from '@/lib/types/database'
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

const makeWorkoutDetails = (): WorkoutWithDetails => ({
  ...makeSession(),
  exercises: [
    {
      exercise: {
        id: 'bench-press',
        name: 'Bench Press',
        primary_muscles: ['chest'],
        equipment: 'barbell',
        category_name: 'Strength',
        gif_path: null,
        preview_image_path: null,
      },
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

    render(<WorkoutSessionManager userId="user-1" />)

    expect(screen.getByText('New Workout')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }))

    await waitFor(() => expect(screen.getByText('Active Workout')).toBeInTheDocument())
    expect(screen.getByText('Add Exercise')).toBeInTheDocument()
  })

  it('renders workout command errors through inline error UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: false, error: 'Unable to start workout' }, { status: 500 }),
      ),
    )

    render(<WorkoutSessionManager userId="user-1" />)

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

    render(<WorkoutSessionManager userId="user-1" existingSession={makeSession()} />)

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())
    expect(screen.getByText('Set 1')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
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

    render(<WorkoutSessionManager userId="user-1" existingSession={makeSession()} />)

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
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
      <WorkoutSessionManager
        userId="user-1"
        existingSession={makeSession()}
        onSessionDelete={onSessionDelete}
      />,
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
