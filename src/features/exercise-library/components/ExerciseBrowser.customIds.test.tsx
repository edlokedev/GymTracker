import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createQueryWrapper } from '../../../../test/queryWrapper'
import ExerciseBrowser from './ExerciseBrowser'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// Signed-in variant of the components.test.tsx auth stub: these tests cover
// the owned-custom-ids query (issue #0017), which only runs for a user.
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'user-1@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const customExercise: ExerciseWithParsedFields = {
  id: 'my-custom-press',
  name: 'my custom press',
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
}

function renderWithQuery(ui: ReactElement) {
  const { wrapper } = createQueryWrapper()
  return render(ui, { wrapper })
}

function mockSignedInLibraryFetch() {
  const customIdsCalls = vi.fn()

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/exercises/custom') {
        customIdsCalls()
        return Response.json({
          success: true,
          data: { items: [customExercise], exerciseIds: [customExercise.id] },
        })
      }
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
            items: [customExercise],
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

  return customIdsCalls
}

const initialFilters = {
  category_id: [],
  equipment: [],
  muscle_group: [],
  query: '',
}

describe('ExerciseBrowser owned custom ids (Query, issue #0017)', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    navigateMock.mockReset()
  })

  it('fetches owned custom ids exactly once across re-renders', async () => {
    const customIdsCalls = mockSignedInLibraryFetch()

    const { wrapper } = createQueryWrapper()
    const { rerender } = render(<ExerciseBrowser initialFilters={initialFilters} />, { wrapper })

    await waitFor(() => expect(customIdsCalls).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('My Custom Press')).toBeInTheDocument())

    rerender(<ExerciseBrowser initialFilters={initialFilters} />)
    rerender(<ExerciseBrowser initialFilters={initialFilters} />)

    expect(customIdsCalls).toHaveBeenCalledTimes(1)
  })

  it('exposes edit/archive for an owned custom exercise in the detail modal', async () => {
    mockSignedInLibraryFetch()

    renderWithQuery(<ExerciseBrowser initialFilters={initialFilters} />)

    await waitFor(() => expect(screen.getByText('My Custom Press')).toBeInTheDocument())

    fireEvent.click(screen.getByText('My Custom Press'))

    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument())
    expect(screen.getByText('Archive')).toBeInTheDocument()
  })
})
