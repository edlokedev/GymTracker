import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import ExerciseBrowser from './components/ExerciseBrowser'
import ExerciseSelector from './components/ExerciseSelector'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const makeExercise = (id: string, name: string): ExerciseWithParsedFields => ({
  id,
  name,
  category_id: 'strength',
  category_name: 'Strength',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  force: null,
  level: undefined,
  mechanic: null,
  gif_path: null,
  preview_image_path: null,
  created_at: new Date(),
  updated_at: new Date(),
})

function mockExerciseLibraryFetch() {
  const exercise = makeExercise('bench-press', 'bench press')

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercise-categories') {
        return Response.json({
          data: [{ id: 'strength', name: 'Strength', exercise_count: 1 }],
        })
      }
      if (url === '/api/equipment-types') {
        return Response.json({ data: ['barbell'] })
      }
      if (url === '/api/muscle-groups') {
        return Response.json({ data: ['chest'] })
      }
      if (url.startsWith('/api/exercises/search')) {
        return Response.json({
          data: [exercise],
          total: 1,
          page: 1,
          totalPages: 1,
          hasMore: false,
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    }),
  )

  return exercise
}

describe('Exercise Library components', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    navigateMock.mockReset()
  })

  it('renders browser results and updates route search when a filter is removed', async () => {
    mockExerciseLibraryFetch()

    render(
      <ExerciseBrowser
        initialFilters={{
          category_id: ['strength'],
          equipment: [],
          muscle_group: [],
          query: '',
        }}
      />,
    )

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())
    expect(screen.getByLabelText('Remove Category filter Strength')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove Category filter Strength'))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        search: {
          category_id: undefined,
          equipment: undefined,
          muscle_group: undefined,
          query: undefined,
        },
        replace: true,
      }),
    )
  })

  it('selects an exercise from the selector modal', async () => {
    const exercise = mockExerciseLibraryFetch()
    const onSelectExercise = vi.fn()

    render(<ExerciseSelector onSelectExercise={onSelectExercise} />)

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Bench Press'))

    expect(onSelectExercise).toHaveBeenCalledWith(expect.objectContaining({ id: exercise.id }))
  })

  it('clears selected exercise without passing null to the select handler', async () => {
    mockExerciseLibraryFetch()
    const onSelectExercise = vi.fn()
    const onClearExercise = vi.fn()

    render(
      <ExerciseSelector
        selectedExercise={makeExercise('bench-press', 'bench press')}
        onSelectExercise={onSelectExercise}
        onClearExercise={onClearExercise}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClearExercise).toHaveBeenCalledOnce()
    expect(onSelectExercise).not.toHaveBeenCalled()
  })
})
