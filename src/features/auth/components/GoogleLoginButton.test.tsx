import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GoogleLoginButton from './GoogleLoginButton'

const authState = vi.hoisted(() => ({
  isLoading: false,
  signIn: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

describe('GoogleLoginButton', () => {
  afterEach(() => {
    cleanup()
    authState.isLoading = false
    authState.signIn.mockReset()
  })

  it('starts Google sign-in when clicked', () => {
    authState.signIn.mockResolvedValue(undefined)

    render(<GoogleLoginButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(authState.signIn).toHaveBeenCalledWith('google')
  })

  it('shows inline feedback when Google sign-in fails', async () => {
    authState.signIn.mockRejectedValue(new Error('OAuth unavailable'))

    render(<GoogleLoginButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Google sign-in failed. Please try again.',
      ),
    )
  })

  it('disables the button while auth is loading', () => {
    authState.isLoading = true

    render(<GoogleLoginButton />)

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })
})
