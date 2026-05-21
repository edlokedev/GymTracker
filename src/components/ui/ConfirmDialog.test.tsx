import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('asks for confirmation before running the destructive action', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        isOpen
        title="Delete Workout"
        description="This will permanently remove the workout."
        confirmLabel="Delete Workout"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Delete Workout' })).toBeInTheDocument()
    expect(screen.getByText('This will permanently remove the workout.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Workout' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
