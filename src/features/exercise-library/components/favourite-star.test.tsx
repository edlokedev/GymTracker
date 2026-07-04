import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createQueryWrapper } from '../../../../test/queryWrapper'
import ExerciseBrowser from './ExerciseBrowser'
import ExerciseCard from './ExerciseCard'
import ExerciseDetailModal from './ExerciseDetailModal'

// ExerciseBrowser is TanStack Query-backed (ADR-0007, Phase 3) and needs a
// fresh QueryClientProvider. The plain ExerciseCard/ExerciseDetailModal tests
// below don't consume Query and use bare render().
function renderWithQuery(ui: ReactElement) {
  const { wrapper } = createQueryWrapper()
  return render(ui, { wrapper })
}

const navigateMock = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({ user: null as { id: string } | null }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: authState.user,
    isAuthenticated: authState.user != null,
    isLoading: false,
  }),
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

interface FetchCall {
  url: string
  method: string
}

// Configurable fetch stub covering the catalog + favourites endpoints the
// ExerciseBrowser hook touches. `favourites` can be a function so a test can
// return a different set after a mutation.
function installFetch(options: {
  searchItems: ExerciseWithParsedFields[]
  favourites?: () => ExerciseWithParsedFields[]
  onMutate?: (method: string) => void
  // When true the favourites mutation never resolves, keeping togglingFavoriteId
  // set so the in-flight disable state can be asserted.
  pendingMutation?: boolean
}) {
  const calls: FetchCall[] = []
  const favourites = options.favourites ?? (() => [])

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ url, method })

    if (url === '/api/exercise-categories') {
      return Response.json({ data: [{ id: 'strength', name: 'Strength', exercise_count: 2 }] })
    }
    if (url === '/api/equipment-types') return Response.json({ data: ['barbell'] })
    if (url === '/api/muscle-groups') return Response.json({ data: ['chest'] })
    if (url.startsWith('/api/exercises/custom')) {
      return Response.json({ success: true, data: { items: [], exerciseIds: [] } })
    }
    if (url.startsWith('/api/exercises/recent')) {
      return Response.json({ success: true, data: { items: [] } })
    }
    if (url.startsWith('/api/exercise-favorites') && (method === 'POST' || method === 'DELETE')) {
      options.onMutate?.(method)
      if (options.pendingMutation) return new Promise<Response>(() => {})
      return Response.json({
        success: true,
        data: { exerciseId: 'x', isFavorite: method === 'POST' },
      })
    }
    if (url.startsWith('/api/exercise-favorites')) {
      const items = favourites()
      return Response.json({
        success: true,
        data: { items, exerciseIds: items.map((item) => item.id) },
      })
    }
    if (url.startsWith('/api/exercises/search')) {
      return Response.json({
        success: true,
        data: {
          items: options.searchItems,
          total: options.searchItems.length,
          page: 1,
          totalPages: 1,
          hasMore: false,
        },
      })
    }

    throw new Error(`Unexpected fetch: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return calls
}

describe('favourite star on /exercises', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    navigateMock.mockReset()
    authState.user = null
  })

  // (a) card star: click + keyboard Enter/Space activate the toggle and never
  // open the detail modal (stopPropagation).
  it('activates the card star via click and keyboard without selecting the card', () => {
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
    fireEvent.click(star)
    fireEvent.keyDown(star, { key: 'Enter' })
    fireEvent.keyDown(star, { key: ' ' })

    expect(onToggleFavorite).toHaveBeenCalledTimes(3)
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'bench-press' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  // (b) detail modal star is wired to the provided toggle action.
  it('toggles favourite from the detail modal star', () => {
    const exercise = makeExercise('bench-press', 'bench press')
    const onToggleFavorite = vi.fn()

    render(
      <ExerciseDetailModal
        exercise={exercise}
        isOpen
        onClose={vi.fn()}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Bench Press to favorites' }))

    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'bench-press' }))
  })

  // (c) anonymous users: no star and no favourites mutation.
  it('shows no star and performs no favourites mutation for signed-out users', async () => {
    authState.user = null
    const calls = installFetch({ searchItems: [makeExercise('bench-press', 'bench press')] })

    renderWithQuery(
      <ExerciseBrowser
        initialFilters={{ category_id: [], equipment: [], muscle_group: [], query: '' }}
      />,
    )

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: /to favorites$/i })).toBeNull()
    expect(
      calls.some(
        (call) =>
          call.url.startsWith('/api/exercise-favorites') &&
          (call.method === 'POST' || call.method === 'DELETE'),
      ),
    ).toBe(false)
  })

  // (d) global concurrency guard: while one toggle is in flight every star is
  // disabled, so a tap on a different card does not start a second toggle.
  it('disables all stars while a toggle is in flight', async () => {
    authState.user = { id: 'u1' }
    let mutations = 0
    const calls = installFetch({
      searchItems: [makeExercise('alpha', 'alpha lift'), makeExercise('beta', 'beta lift')],
      // Keep the first mutation pending so togglingFavoriteId stays set.
      pendingMutation: true,
      onMutate: () => {
        mutations += 1
      },
    })

    renderWithQuery(
      <ExerciseBrowser
        initialFilters={{ category_id: [], equipment: [], muscle_group: [], query: '' }}
      />,
    )

    await waitFor(() => expect(screen.getByText('Alpha Lift')).toBeInTheDocument())

    const starA = screen.getByRole('button', { name: 'Add Alpha Lift to favorites' })
    fireEvent.click(starA)

    const starB = await screen.findByRole('button', { name: 'Add Beta Lift to favorites' })
    await waitFor(() => expect(starB).toBeDisabled())

    fireEvent.click(starB)

    // Only the first toggle hit the favourites mutation endpoint.
    const mutationCalls = calls.filter(
      (call) =>
        call.url.startsWith('/api/exercise-favorites') &&
        (call.method === 'POST' || call.method === 'DELETE'),
    )
    expect(mutationCalls).toHaveLength(1)
    expect(mutations).toBe(1)
  })

  // (e) favourites-only filter active + successful un-favourite removes the card.
  it('drops an un-favourited card from the grid while the favourites filter is active', async () => {
    authState.user = { id: 'u1' }
    let deleted = false
    installFetch({
      searchItems: [],
      favourites: () =>
        deleted
          ? [makeExercise('beta', 'beta lift')]
          : [makeExercise('alpha', 'alpha lift'), makeExercise('beta', 'beta lift')],
      onMutate: (method) => {
        if (method === 'DELETE') deleted = true
      },
    })

    renderWithQuery(
      <ExerciseBrowser
        initialFilters={{
          category_id: [],
          equipment: [],
          muscle_group: [],
          query: '',
          favourites: true,
        }}
      />,
    )

    await waitFor(() => expect(screen.getByText('Alpha Lift')).toBeInTheDocument())
    expect(screen.getByText('Beta Lift')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha Lift from favorites' }))

    await waitFor(() => expect(screen.queryByText('Alpha Lift')).toBeNull())
    expect(screen.getByText('Beta Lift')).toBeInTheDocument()
  })

  // (f) favourites filter active + failed toggle leaves the grid intact and the
  // star reverts to favourited (optimistic step never touches the displayed list).
  it('keeps the grid intact and reverts the star when a toggle fails under the filter', async () => {
    authState.user = { id: 'u1' }
    installFetch({
      searchItems: [],
      favourites: () => [makeExercise('alpha', 'alpha lift'), makeExercise('beta', 'beta lift')],
      onMutate: () => {
        throw new Error('network down')
      },
    })

    renderWithQuery(
      <ExerciseBrowser
        initialFilters={{
          category_id: [],
          equipment: [],
          muscle_group: [],
          query: '',
          favourites: true,
        }}
      />,
    )

    await waitFor(() => expect(screen.getByText('Alpha Lift')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha Lift from favorites' }))

    // Toggle rejects → onError rolls back and onSettled re-reads the server
    // favourites, so both cards stay shown and the star reverts to favourited.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Alpha Lift from favorites' }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Alpha Lift')).toBeInTheDocument()
    expect(screen.getByText('Beta Lift')).toBeInTheDocument()
  })
})
