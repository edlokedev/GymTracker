import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'

const invalidateMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Ada Lovelace', email: 'ada@example.com', image: null },
    signOut: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    invalidate: invalidateMock,
  }),
}))

describe('GlobalErrorBoundary', () => {
  afterEach(() => {
    cleanup()
    invalidateMock.mockReset()
  })

  it('shows the error message and lets the caller reset', () => {
    const reset = vi.fn()

    render(<GlobalErrorBoundary error={new Error('Database is unavailable')} reset={reset} />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('Database is unavailable')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(reset).toHaveBeenCalledOnce()
  })

  it('hides the reset action when no reset handler is provided', () => {
    render(<GlobalErrorBoundary error={new Error('Route failed')} />)

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument()
  })
})
