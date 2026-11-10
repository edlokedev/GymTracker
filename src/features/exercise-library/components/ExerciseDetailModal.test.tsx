import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createQueryWrapper } from '../../../../test/queryWrapper'
import ExerciseDetailModal from './ExerciseDetailModal'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}))

const exercise: ExerciseWithParsedFields = {
  id: 'my-custom-press',
  name: 'my custom press',
  category_id: 'strength',
  category_name: 'Strength',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  gif_path: null,
  preview_image_path: null,
  created_at: new Date(),
  updated_at: new Date(),
}

describe('ExerciseDetailModal archive', () => {
  afterEach(cleanup)

  it('keeps the confirm dialog open and shows an error when archiving fails', async () => {
    const onArchiveExercise = vi.fn().mockRejectedValue(new Error('boom'))
    const { wrapper } = createQueryWrapper()
    render(
      <ExerciseDetailModal
        exercise={exercise}
        isOpen
        onClose={vi.fn()}
        canManage
        onArchiveExercise={onArchiveExercise}
      />,
      { wrapper },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive this exercise?' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Archive' }).at(-1) as HTMLElement)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t archive/i))
    expect(dialog).toBeInTheDocument()
    expect(onArchiveExercise).toHaveBeenCalledTimes(1)
  })
})
