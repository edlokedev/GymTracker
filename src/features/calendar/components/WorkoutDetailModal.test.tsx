import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkoutDetailModal } from './WorkoutDetailModal'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search: _search,
    ...props
  }: {
    children: ReactNode
    to: string
    search?: unknown
    onClick?: MouseEventHandler<HTMLAnchorElement>
    className?: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

const workout = {
  id: 'workout-1',
  userId: 'user-1',
  name: 'Full Body',
  date: '2026-04-25T00:00:00.000Z',
  notes: 'Good',
  sets: [
    {
      id: 'set-1',
      sessionId: 'workout-1',
      exerciseId: 'exercise-1',
      setNumber: 1,
      exerciseName: 'machine inner chest press',
      reps: 12,
      weight: 27.5,
    },
  ],
  totalVolume: 330,
  exerciseCount: 1,
}

describe('WorkoutDetailModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows workout details without redundant footer close action', () => {
    render(
      <WorkoutDetailModal
        isOpen
        onClose={vi.fn()}
        workout={workout}
        selectedDate={new Date('2026-04-25T00:00:00.000Z')}
        isLoading={false}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Full Body' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Full Body' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close workout details' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Weight' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Machine Inner Chest Press' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Full Body' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicate Full Body' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Volume' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.queryByText('Edit Workout')).not.toBeInTheDocument()
  })

  it('closes on backdrop click but keeps clicks inside the modal open', () => {
    const onClose = vi.fn()

    render(
      <WorkoutDetailModal
        isOpen
        onClose={onClose}
        workout={workout}
        selectedDate={new Date('2026-04-25T00:00:00.000Z')}
        isLoading={false}
      />,
    )

    fireEvent.click(screen.getByRole('dialog', { name: 'Full Body' }))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('delegates duplicate/delete commands without fetching in the modal', async () => {
    const onDuplicateWorkout = vi.fn()
    const onDeleteWorkout = vi.fn()
    const onWorkoutDeleted = vi.fn()
    const onClose = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    render(
      <WorkoutDetailModal
        isOpen
        onClose={onClose}
        workout={workout}
        selectedDate={new Date('2026-04-25T00:00:00.000Z')}
        isLoading={false}
        onDuplicateWorkout={onDuplicateWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onWorkoutDeleted={onWorkoutDeleted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Full Body' }))
    await waitFor(() => expect(onDuplicateWorkout).toHaveBeenCalledWith('workout-1'))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete workout' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workout' }))

    await waitFor(() => expect(onDeleteWorkout).toHaveBeenCalledWith('workout-1'))
    expect(onWorkoutDeleted).toHaveBeenCalledWith('workout-1')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
