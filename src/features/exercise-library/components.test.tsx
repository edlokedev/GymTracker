import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createQueryWrapper } from '../../../test/queryWrapper'
import ExerciseBrowser from './components/ExerciseBrowser'
import { MobileFilterDrawer } from './components/ExerciseBrowserFilters'
import ExerciseCard from './components/ExerciseCard'
import { ExerciseHistory } from './components/ExerciseHistory'
import ExerciseSelector from './components/ExerciseSelector'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// ExerciseBrowser and the picker read the authed user (for the Add-exercise
// affordance); default to signed-out so catalog-rendering tests stay focused,
// and let the Add-exercise test opt into a signed-in user.
const authUser = vi.hoisted(() => ({ current: null as { id: string } | null }))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: authUser.current,
    isAuthenticated: authUser.current !== null,
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

// TanStack Query-backed components (ExerciseBrowser, ExerciseSelector,
// ExerciseHistory) must render inside a fresh QueryClientProvider (ADR-0007).
function renderWithQuery(ui: ReactElement) {
  const { wrapper } = createQueryWrapper()
  return render(ui, { wrapper })
}

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
      if (url === '/api/exercise-favorites') {
        return Response.json({ success: true, data: { items: [], exerciseIds: [] } })
      }
      if (url.startsWith('/api/exercises/recent')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/suggested')) {
        return Response.json({ success: true, data: { items: [] } })
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

// Same catalog mock, but recents + favourites stay in flight until the test
// resolves them — lets the picker's loading→settled sequencing be asserted.
function mockExerciseLibraryFetchPendingQuickPicks() {
  const exercise = makeExercise('bench-press', 'bench press')
  let resolveRecent: (response: Response) => void = () => {}
  let resolveFavorites: (response: Response) => void = () => {}
  const recentResponse = new Promise<Response>((resolve) => {
    resolveRecent = resolve
  })
  const favoritesResponse = new Promise<Response>((resolve) => {
    resolveFavorites = resolve
  })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercise-categories') {
        return Response.json({ data: [{ id: 'strength', name: 'Strength', exercise_count: 1 }] })
      }
      if (url === '/api/equipment-types') {
        return Response.json({ data: ['barbell'] })
      }
      if (url === '/api/muscle-groups') {
        return Response.json({ data: ['chest'] })
      }
      if (url === '/api/exercise-favorites') {
        return await favoritesResponse
      }
      if (url.startsWith('/api/exercises/recent')) {
        return await recentResponse
      }
      if (url.startsWith('/api/exercises/suggested')) {
        return Response.json({ success: true, data: { items: [] } })
      }
      if (url.startsWith('/api/exercises/search')) {
        return Response.json({
          success: true,
          data: { items: [exercise], total: 1, page: 1, totalPages: 1, hasMore: false },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    }),
  )

  return {
    resolveRecent: (items: unknown[]) =>
      resolveRecent(Response.json({ success: true, data: { items } })),
    resolveFavorites: (items: ExerciseWithParsedFields[]) =>
      resolveFavorites(
        Response.json({
          success: true,
          data: { items, exerciseIds: items.map((item) => item.id) },
        }),
      ),
  }
}

describe('Exercise Library components', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    navigateMock.mockReset()
    authUser.current = null
  })

  it('renders browser results and updates route search when a filter is removed', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(
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

  it('selects an exercise from the selector modal and closes it', async () => {
    const exercise = mockExerciseLibraryFetch()
    const onSelectExercise = vi.fn()

    renderWithQuery(<ExerciseSelector onSelectExercise={onSelectExercise} />)

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Bench Press'))

    expect(onSelectExercise).toHaveBeenCalledWith(expect.objectContaining({ id: exercise.id }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a three-tab picker with Search active by default', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const tablist = screen.getByRole('tablist', { name: /exercise picker/i })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Search', 'Recent', 'Favourites'])

    const [searchTab, recentTab, favouritesTab] = tabs
    expect(searchTab).toHaveAttribute('aria-selected', 'true')
    expect(searchTab).toHaveAttribute('tabindex', '0')
    expect(recentTab).toHaveAttribute('aria-selected', 'false')
    expect(recentTab).toHaveAttribute('tabindex', '-1')
    expect(favouritesTab).toHaveAttribute('aria-selected', 'false')
    expect(favouritesTab).toHaveAttribute('tabindex', '-1')

    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls')
      const panel = panelId ? document.getElementById(panelId) : null
      expect(panel).not.toBeNull()
      expect(panel).toHaveAttribute('role', 'tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    }

    expect(document.getElementById('exercise-picker-panel-search')).not.toHaveAttribute('hidden')
    expect(document.getElementById('exercise-picker-panel-recent')).toHaveAttribute('hidden')
    expect(document.getElementById('exercise-picker-panel-favorites')).toHaveAttribute('hidden')
  })

  it('moves and activates tabs with arrow, Home and End keys', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const searchTab = screen.getByRole('tab', { name: /search/i })
    const recentTab = screen.getByRole('tab', { name: /recent/i })
    const favouritesTab = screen.getByRole('tab', { name: /favourites/i })

    searchTab.focus()
    fireEvent.keyDown(searchTab, { key: 'ArrowRight' })
    expect(recentTab).toHaveAttribute('aria-selected', 'true')
    expect(recentTab).toHaveFocus()
    expect(document.getElementById('exercise-picker-panel-recent')).not.toHaveAttribute('hidden')
    expect(document.getElementById('exercise-picker-panel-search')).toHaveAttribute('hidden')

    fireEvent.keyDown(recentTab, { key: 'ArrowLeft' })
    expect(searchTab).toHaveAttribute('aria-selected', 'true')
    expect(searchTab).toHaveFocus()

    fireEvent.keyDown(searchTab, { key: 'End' })
    expect(favouritesTab).toHaveAttribute('aria-selected', 'true')
    expect(favouritesTab).toHaveFocus()

    fireEvent.keyDown(favouritesTab, { key: 'Home' })
    expect(searchTab).toHaveAttribute('aria-selected', 'true')
    expect(searchTab).toHaveFocus()
  })

  it('selects a favourite from the Favourites tab; star clicks never select', async () => {
    mockExerciseLibraryFetch()
    const onSelectExercise = vi.fn()
    const onToggleFavorite = vi.fn()

    renderWithQuery(
      <ExerciseSelector
        onSelectExercise={onSelectExercise}
        onToggleFavorite={onToggleFavorite}
        favoriteExerciseIds={['front-squat']}
        favoriteExercises={[makeExercise('front-squat', 'front squat')]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    fireEvent.click(screen.getByRole('tab', { name: /favourites/i }))

    const panel = document.getElementById('exercise-picker-panel-favorites') as HTMLElement
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Remove Front Squat from favorites' }),
    )
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'front-squat' }))
    expect(onSelectExercise).not.toHaveBeenCalled()

    fireEvent.click(within(panel).getAllByRole('button', { name: /front squat/i })[0])
    expect(onSelectExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'front-squat' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the full recent list with use-count meta in the Recent tab', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        recentlyUsedExercises={[
          { exercise: makeExercise('recent-1', 'recent one'), useCount: 4 },
          { exercise: makeExercise('recent-2', 'recent two'), useCount: 3 },
          { exercise: makeExercise('recent-3', 'recent three'), useCount: 2 },
          {
            exercise: makeExercise('recent-4', 'recent four'),
            useCount: 1,
            lastUsedAt: '2026-08-20',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }))

    const panel = document.getElementById('exercise-picker-panel-recent') as HTMLElement
    expect(within(panel).getByText('Recent One')).toBeInTheDocument()
    expect(within(panel).getByText('Recent Four')).toBeInTheDocument()
    expect(within(panel).getByText('Used 4 times')).toBeInTheDocument()
    expect(within(panel).getByText('Used recently')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /show \d+ more/i })).toBeNull()
  })

  it('caps Suggested at three and hides it once a query or filter is active', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        suggestedExercises={[
          {
            exercise: makeExercise('suggest-1', 'suggest one'),
            reasons: ['same muscle', 'same equipment'],
          },
          { exercise: makeExercise('suggest-2', 'suggest two') },
          { exercise: makeExercise('suggest-3', 'suggest three') },
          { exercise: makeExercise('suggest-4', 'suggest four') },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const suggested = screen.getByRole('region', { name: 'Suggested' })
    expect(within(suggested).getByText('Suggest One')).toBeInTheDocument()
    expect(within(suggested).getByText('Suggest Three')).toBeInTheDocument()
    expect(within(suggested).queryByText('Suggest Four')).toBeNull()
    expect(within(suggested).getByText('1')).toBeInTheDocument()
    expect(within(suggested).getByText('same muscle + same equipment')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search by name or muscle group/i)
    fireEvent.change(searchInput, { target: { value: 'bench' } })
    expect(screen.queryByRole('region', { name: 'Suggested' })).toBeNull()

    fireEvent.change(searchInput, { target: { value: '   ' } })
    expect(screen.getByRole('region', { name: 'Suggested' })).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByRole('region', { name: 'Suggested' })).toBeInTheDocument()

    // Category options arrive async; wait for them before selecting one.
    await screen.findByRole('option', { name: 'Strength' })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'strength' } })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Suggested' })).toBeNull())
  })

  it('resets to the Search tab when the picker is reopened', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }))
    expect(screen.getByRole('tab', { name: /recent/i })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Close exercise selector' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    expect(screen.getByRole('tab', { name: /search/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows labelled loading states and hides tab badges until quick picks settle', async () => {
    const { resolveRecent, resolveFavorites } = mockExerciseLibraryFetchPendingQuickPicks()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const recentTab = screen.getByRole('tab', { name: /recent/i })
    const favouritesTab = screen.getByRole('tab', { name: /favourites/i })
    expect(recentTab).toHaveTextContent(/^Recent$/)
    expect(favouritesTab).toHaveTextContent(/^Favourites$/)

    fireEvent.click(recentTab)
    const recentPanel = document.getElementById('exercise-picker-panel-recent') as HTMLElement
    expect(within(recentPanel).getByText('Loading recent exercises…')).toBeInTheDocument()
    expect(within(recentPanel).queryByText(/no recent exercises yet/i)).toBeNull()

    fireEvent.click(favouritesTab)
    const favouritesPanel = document.getElementById(
      'exercise-picker-panel-favorites',
    ) as HTMLElement
    expect(within(favouritesPanel).getByText('Loading favourites…')).toBeInTheDocument()
    expect(within(favouritesPanel).queryByText(/no favourites yet/i)).toBeNull()

    resolveRecent([
      { exercise: makeExercise('recent-1', 'recent one'), useCount: 2, lastUsedAt: '2026-08-20' },
    ])
    resolveFavorites([makeExercise('fav-1', 'fav one'), makeExercise('fav-2', 'fav two')])

    await waitFor(() => expect(within(favouritesPanel).getByText('Fav One')).toBeInTheDocument())
    expect(within(favouritesPanel).queryByText('Loading favourites…')).toBeNull()
    expect(favouritesTab).toHaveTextContent(/^Favourites2$/)
    await waitFor(() => expect(recentTab).toHaveTextContent(/^Recent1$/))
  })

  it('settles immediately when quick-pick lists come from props', async () => {
    mockExerciseLibraryFetchPendingQuickPicks()

    renderWithQuery(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        recentlyUsedExercises={[{ exercise: makeExercise('recent-1', 'recent one'), useCount: 2 }]}
        favoriteExercises={[makeExercise('fav-1', 'fav one')]}
        favoriteExerciseIds={['fav-1']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }))

    const recentPanel = document.getElementById('exercise-picker-panel-recent') as HTMLElement
    expect(within(recentPanel).queryByText('Loading recent exercises…')).toBeNull()
    expect(within(recentPanel).getByText('Recent One')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /recent/i })).toHaveTextContent(/^Recent1$/)
    expect(screen.getByRole('tab', { name: /favourites/i })).toHaveTextContent(/^Favourites1$/)
  })

  it('moves focus to the next row when a favourite is unstarred, then to the Search CTA', async () => {
    mockExerciseLibraryFetch()
    const onToggleFavorite = vi.fn()
    const favourites = [
      makeExercise('fav-1', 'fav one'),
      makeExercise('fav-2', 'fav two'),
      makeExercise('fav-3', 'fav three'),
    ]

    const { rerender } = renderWithQuery(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        onToggleFavorite={onToggleFavorite}
        favoriteExercises={favourites}
        favoriteExerciseIds={favourites.map((exercise) => exercise.id)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))
    fireEvent.click(screen.getByRole('tab', { name: /favourites/i }))

    const panel = document.getElementById('exercise-picker-panel-favorites') as HTMLElement
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove Fav One from favorites' }))
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'fav-1' }))

    const afterFirst = favourites.slice(1)
    rerender(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        onToggleFavorite={onToggleFavorite}
        favoriteExercises={afterFirst}
        favoriteExerciseIds={afterFirst.map((exercise) => exercise.id)}
      />,
    )

    expect(
      within(panel).getByRole('button', { name: 'Remove Fav Two from favorites' }),
    ).toHaveFocus()

    fireEvent.click(within(panel).getByRole('button', { name: 'Remove Fav Two from favorites' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove Fav Three from favorites' }))
    rerender(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        onToggleFavorite={onToggleFavorite}
        favoriteExercises={[]}
        favoriteExerciseIds={[]}
      />,
    )

    const cta = await within(panel).findByRole('button', { name: 'Browse exercises' })
    await waitFor(() => expect(cta).toHaveFocus())

    fireEvent.click(cta)
    expect(screen.getByRole('tab', { name: /search/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /search/i })).toHaveFocus()
  })

  it('debounces the query by 300ms and keeps query + filters across reopens', async () => {
    mockExerciseLibraryFetch()
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    const searchCalls = () =>
      fetchMock.mock.calls
        .map(([input]: [RequestInfo | URL]) => String(input))
        .filter((url: string) => url.startsWith('/api/exercises/search'))

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    const searchInput = screen.getByPlaceholderText(/search by name or muscle group/i)
    fireEvent.change(searchInput, { target: { value: 'bench' } })

    // Debounced: the query is not pushed to the search request immediately.
    expect(searchCalls().some((url: string) => url.includes('query=bench'))).toBe(false)
    await waitFor(() =>
      expect(searchCalls().some((url: string) => url.includes('query=bench'))).toBe(true),
    )

    await screen.findByRole('option', { name: 'Strength' })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'strength' } })
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue('strength'))

    fireEvent.click(screen.getByRole('button', { name: 'Close exercise selector' }))
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    expect(screen.getByPlaceholderText(/search by name or muscle group/i)).toHaveValue('bench')
    expect(screen.getByLabelText('Category')).toHaveValue('strength')
  })

  it('observes the infinite-scroll sentinel only while the Search tab is active', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/exercise-categories') {
          return Response.json({ data: [{ id: 'strength', name: 'Strength', exercise_count: 1 }] })
        }
        if (url === '/api/equipment-types') return Response.json({ data: ['barbell'] })
        if (url === '/api/muscle-groups') return Response.json({ data: ['chest'] })
        if (url === '/api/exercise-favorites') {
          return Response.json({ success: true, data: { items: [], exerciseIds: [] } })
        }
        if (url.startsWith('/api/exercises/recent')) {
          return Response.json({ success: true, data: { items: [] } })
        }
        if (url.startsWith('/api/exercises/suggested')) {
          return Response.json({ success: true, data: { items: [] } })
        }
        if (url.startsWith('/api/exercises/search')) {
          return Response.json({
            success: true,
            data: {
              items: [makeExercise('bench-press', 'bench press')],
              total: 40,
              page: 1,
              totalPages: 2,
              hasMore: true,
            },
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      }),
    )

    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe
        unobserve = vi.fn()
        disconnect = disconnect
        takeRecords = vi.fn(() => [])
        root = null
        rootMargin = ''
        thresholds = []
      },
    )

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    await waitFor(() => expect(observe).toHaveBeenCalled())
    const observeCallsOnSearch = observe.mock.calls.length

    fireEvent.click(screen.getByRole('tab', { name: /recent/i }))
    await waitFor(() => expect(disconnect).toHaveBeenCalled())
    expect(observe.mock.calls.length).toBe(observeCallsOnSearch)

    fireEvent.click(screen.getByRole('tab', { name: /search/i }))
    await waitFor(() => expect(observe.mock.calls.length).toBeGreaterThan(observeCallsOnSearch))
  })

  it('opens from requestOpenSignal and reports backdrop dismissal via onPickerClose', async () => {
    mockExerciseLibraryFetch()
    const onPickerClose = vi.fn()

    const { rerender } = renderWithQuery(
      <ExerciseSelector onSelectExercise={vi.fn()} onPickerClose={onPickerClose} />,
    )

    expect(screen.queryByRole('dialog')).toBeNull()

    rerender(
      <ExerciseSelector
        onSelectExercise={vi.fn()}
        onPickerClose={onPickerClose}
        requestOpenSignal={1}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Backdrop click dismisses; clicks inside the sheet do not.
    fireEvent.click(dialog)
    expect(onPickerClose).not.toHaveBeenCalled()

    fireEvent.click(dialog.parentElement as HTMLElement)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onPickerClose).toHaveBeenCalledOnce()
  })

  it('offers the +Add custom-exercise affordance to signed-in users only', async () => {
    authUser.current = { id: 'user-1' }
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    // The leading "+" glyph is aria-hidden, so the accessible name is just "Add".
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    // CustomExerciseForm is not a role=dialog yet (pre-existing a11y debt), so
    // pin its heading instead.
    expect(await screen.findByRole('heading', { name: 'Add custom exercise' })).toBeInTheDocument()
  })

  it('gives every tab panel a single safe-area padded scroll body', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /select an exercise/i }))

    for (const id of ['search', 'recent', 'favorites']) {
      const panel = document.getElementById(`exercise-picker-panel-${id}`) as HTMLElement
      const scrollBodies = panel.querySelectorAll('.overflow-y-auto')
      expect(scrollBodies).toHaveLength(1)
      const scrollBody = scrollBodies[0]
      expect(scrollBody.className).toContain('overscroll-contain')
      expect(scrollBody.className).toContain('pb-[max(env(safe-area-inset-bottom),1rem)]')
    }
  })

  it('does not move focus when the picker opens', async () => {
    mockExerciseLibraryFetch()

    renderWithQuery(<ExerciseSelector onSelectExercise={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: /select an exercise/i })
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('renders exercise history in recorded set order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          success: true,
          data: [
            {
              id: 'hist-set-3',
              set_number: 3,
              reps: 10,
              weight: 42.5,
              session_date: '2026-06-02',
              session_name: 'Casual office gym day',
            },
            {
              id: 'hist-set-1',
              set_number: 1,
              reps: 10,
              weight: 35,
              session_date: '2026-06-02',
              session_name: 'Casual office gym day',
            },
            {
              id: 'hist-set-2',
              set_number: 2,
              reps: 10,
              weight: 42.5,
              session_date: '2026-06-02',
              session_name: 'Casual office gym day',
            },
          ],
        }),
      ),
    )

    renderWithQuery(<ExerciseHistory exerciseId="lever-front-pulldown" />)

    await waitFor(() => expect(screen.getByText('Set 1')).toBeInTheDocument())

    const setOne = screen.getByText('Set 1').parentElement
    const setTwo = screen.getByText('Set 2').parentElement
    const setThree = screen.getByText('Set 3').parentElement

    expect(setOne).toHaveTextContent('35kg x 10')
    expect(setTwo).toHaveTextContent('42.5kg x 10')
    expect(setThree).toHaveTextContent('42.5kg x 10')
    expect(setOne?.compareDocumentPosition(setTwo as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(setTwo?.compareDocumentPosition(setThree as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('settles to the empty state (no stuck spinner) when the history request fails', async () => {
    // Regression contract for the client-layer migration (audit finding: the
    // component bypassed the client with a raw fetch that silently ignored
    // !res.ok). It now goes through readApiData, which rejects on a failed
    // response; the query lands in error state and the component shows the
    // empty state rather than hanging on the loading spinner.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    )

    renderWithQuery(<ExerciseHistory exerciseId="lever-front-pulldown" />)

    await waitFor(() =>
      expect(
        screen.getByText('No progressive overload history found for this exercise.'),
      ).toBeInTheDocument(),
    )
  })

  it('toggles favorites from an accessible star without selecting the card', () => {
    const exercise = makeExercise('bench-press', 'bench press')
    const onSelect = vi.fn()
    const onToggleFavorite = vi.fn()

    renderWithQuery(
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

    renderWithQuery(
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
