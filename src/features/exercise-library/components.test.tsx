import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import ExerciseBrowser from './components/ExerciseBrowser'
import { MobileFilterDrawer } from './components/ExerciseBrowserFilters'
import ExerciseCard from './components/ExerciseCard'
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
          success: true,
          data: {
            items: [exercise],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
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

  it('renders quick sections before selector search and selects quick picks', async () => {
    mockExerciseLibraryFetch()
    const onSelectExercise = vi.fn()

    render(
      <ExerciseSelector
        onSelectExercise={onSelectExercise}
        favoriteExerciseIds={['front-squat']}
        favoriteExercises={[makeExercise('front-squat', 'front squat')]}
        recentlyUsedExercises={[
          {
            exercise: makeExercise('romanian-deadlift', 'romanian deadlift'),
            useCount: 3,
          },
        ]}
        suggestedExercises={[
          {
            exercise: makeExercise('incline-press', 'incline press'),
            reasons: ['same muscle', 'same equipment'],
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const favoritesSection = screen.getByRole('region', { name: 'Favorites' })
    const searchInput = screen.getByPlaceholderText(/search by name or muscle group/i)

    expect(favoritesSection.compareDocumentPosition(searchInput)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('region', { name: 'Recently Used' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Suggested' })).toBeInTheDocument()

    fireEvent.click(within(favoritesSection).getAllByRole('button', { name: /front squat/i })[0])

    expect(onSelectExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'front-squat' }))
  })

  it('collapses extra quick picks behind an inline expander', async () => {
    mockExerciseLibraryFetch()

    render(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        recentlyUsedExercises={[
          { exercise: makeExercise('recent-1', 'recent one'), useCount: 4 },
          { exercise: makeExercise('recent-2', 'recent two'), useCount: 3 },
          { exercise: makeExercise('recent-3', 'recent three'), useCount: 2 },
          { exercise: makeExercise('recent-4', 'recent four'), useCount: 1 },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const recentSection = screen.getByRole('region', { name: 'Recently Used' })
    expect(within(recentSection).getByText('Recent One')).toBeInTheDocument()
    expect(within(recentSection).getByText('Recent Three')).toBeInTheDocument()
    expect(within(recentSection).queryByText('Recent Four')).toBeNull()

    const showMore = within(recentSection).getByRole('button', { name: 'Show 1 more' })
    expect(showMore).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(showMore)

    expect(within(recentSection).getByText('Recent Four')).toBeInTheDocument()
    expect(within(recentSection).getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('toggles favorites from an accessible star without selecting the card', () => {
    const exercise = makeExercise('bench-press', 'bench press')
    const onSelect = vi.fn()
    const onToggleFavorite = vi.fn()

    render(
      <ExerciseCard
        exercise={exercise}
        onSelect={onSelect}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    const star = screen.getByRole('button', { name: 'Add Bench Press to favorites' })
    expect(star).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(star)

    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: exercise.id }))
    expect(onSelect).not.toHaveBeenCalled()
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

  it('renders the mobile filter drawer as a dialog', () => {
    const onToggle = vi.fn()

    render(
      <MobileFilterDrawer isOpen onToggle={onToggle}>
        <p>Filter controls</p>
      </MobileFilterDrawer>,
    )

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByText('Filter controls')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }))

    expect(onToggle).toHaveBeenCalledOnce()
  })
})
