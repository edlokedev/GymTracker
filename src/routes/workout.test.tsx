import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@/lib/types/database'

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as { id: string } | null,
  signInWithGoogle: vi.fn(),
}))

const routerState = vi.hoisted(() => ({
  search: {} as { sessionId?: string; templateId?: string },
  navigate: vi.fn(),
}))

// Props the page hands to the (mocked) session manager.
const managerProps = vi.hoisted(() => ({
  current: {} as {
    existingSession?: { id: string }
    initialTemplateId?: string
    onSessionSave?: (session: unknown) => void
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

// The route file calls createFileRoute(...) at module load and Route.useSearch()
// inside the component; stub both so we can render WorkoutPage in isolation.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({
    ...(opts as object),
    useSearch: () => routerState.search,
  }),
  useNavigate: () => routerState.navigate,
}))

vi.mock('@/features/workout-session/components/WorkoutSessionManager', () => ({
  default: (props: typeof managerProps.current) => {
    managerProps.current = props
    return <div data-testid="workout-session-manager" />
  },
}))

import { WorkoutPage } from './workout'

const makeSession = (id: string): WorkoutSession => ({
  id,
  user_id: 'user-1',
  date: '2026-05-01',
  start_time: '2026-05-01T10:00:00.000Z',
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
})

describe('WorkoutPage (unauthenticated)', () => {
  afterEach(() => {
    cleanup()
    authState.isAuthenticated = false
    authState.isLoading = false
    authState.user = null
  })

  it('renders the shared LoginPage when the visitor is signed out', () => {
    render(<WorkoutPage />)

    // LoginPage heading — a real sign-in surface, not the old dead-end prompt.
    expect(screen.getByRole('heading', { name: 'Welcome to Gymmie' })).toBeInTheDocument()
    expect(screen.queryByText('Please sign in to track your workouts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('workout-session-manager')).not.toBeInTheDocument()
  })

  it('renders the session manager for an authenticated user', () => {
    authState.isAuthenticated = true
    authState.user = { id: 'user-1' }

    render(<WorkoutPage />)

    expect(screen.getByTestId('workout-session-manager')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Welcome to Gymmie' })).not.toBeInTheDocument()
  })
})

describe('WorkoutPage session id in the URL', () => {
  beforeEach(() => {
    authState.isAuthenticated = true
    authState.user = { id: 'user-1' }
    routerState.search = {}
    routerState.navigate.mockReset()
    managerProps.current = {}
  })

  afterEach(() => {
    cleanup()
    authState.isAuthenticated = false
    authState.user = null
  })

  // I2: a reload of /workout must not start a second session.
  it('writes a manually started session id into the URL', () => {
    render(<WorkoutPage />)

    act(() => managerProps.current.onSessionSave?.(makeSession('session-1')))

    expect(routerState.navigate).toHaveBeenCalledWith({
      to: '/workout',
      search: { sessionId: 'session-1' },
      replace: true,
    })
  })

  // A reload of /workout?templateId=X would start a second session from the
  // template; the template id must be replaced, not kept.
  it('replaces the template id with the started session id', () => {
    routerState.search = { templateId: 'template-1' }
    render(<WorkoutPage />)
    expect(managerProps.current.initialTemplateId).toBe('template-1')

    act(() => managerProps.current.onSessionSave?.(makeSession('session-1')))

    expect(routerState.navigate).toHaveBeenCalledWith({
      to: '/workout',
      search: { sessionId: 'session-1' },
      replace: true,
    })
  })

  it('does not navigate on later saves of the session already in the URL', () => {
    routerState.search = { sessionId: 'session-1' }
    render(<WorkoutPage />)

    act(() => managerProps.current.onSessionSave?.(makeSession('session-1')))

    expect(routerState.navigate).not.toHaveBeenCalled()
  })

  // I3: leaving an edited workout for plain /workout must not keep logging
  // sets into the old session.
  it('drops the old session when sessionId leaves the URL', async () => {
    routerState.search = { sessionId: 'session-1' }
    const { rerender } = render(<WorkoutPage />)
    expect(managerProps.current.existingSession?.id).toBe('session-1')

    routerState.search = {}
    rerender(<WorkoutPage />)

    expect(managerProps.current.existingSession).toBeUndefined()
  })
})
