import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Header from './Header'

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  user: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: '/ada.png',
  } as { name: string; email: string; image: string } | null,
  signOut: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('Header', () => {
  afterEach(() => {
    cleanup()
    authState.isAuthenticated = true
    authState.user = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      image: '/ada.png',
    }
    authState.signOut.mockReset()
  })

  it('renders the authenticated app navigation and signs out', () => {
    const { container } = render(<Header />)

    expect(screen.getByRole('link', { name: /gymmie/i })).toHaveAttribute('href', '/')
    expect(container.querySelector('img[src="/gymmie-icon.png"]')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('link', { name: 'Workouts' })[0]).toHaveAttribute(
      'href',
      '/workouts',
    )
    expect(screen.getAllByRole('link', { name: 'Exercises' })[0]).toHaveAttribute(
      'href',
      '/exercises',
    )
    expect(screen.getAllByRole('link', { name: 'History' })[0]).toHaveAttribute('href', '/history')
    expect(screen.getAllByRole('link', { name: 'Progress' })[0]).toHaveAttribute(
      'href',
      '/progress',
    )
    expect(screen.queryByRole('link', { name: 'Log' })).not.toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign Out' })[0])
    expect(authState.signOut).toHaveBeenCalledOnce()
  })

  it('keeps the public header free of removed demo routes', () => {
    authState.isAuthenticated = false
    authState.user = null

    render(<Header />)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Exercise Library' })).toHaveAttribute(
      'href',
      '/exercises',
    )
    expect(screen.queryByText(/Demo:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument()
  })
})
