import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as { id: string } | null,
  signInWithGoogle: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

// The route file calls createFileRoute(...) at module load and Route.useSearch()
// inside the component; stub both so we can render WorkoutPage in isolation.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({
    ...(opts as object),
    useSearch: () => ({}),
  }),
}))

vi.mock('@/features/workout-session/components/WorkoutSessionManager', () => ({
  default: () => <div data-testid="workout-session-manager" />,
}))

import { WorkoutPage } from './workout'

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
