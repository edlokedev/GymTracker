import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'

describe('GlobalErrorBoundary', () => {
  afterEach(() => {
    cleanup()
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

  it('does not render its own Header (the root shell already provides it)', () => {
    render(<GlobalErrorBoundary error={new Error('boom')} />)

    // No app navigation from a nested Header — avoids doubling under the root layout.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /gymmie/i })).not.toBeInTheDocument()
  })
})
