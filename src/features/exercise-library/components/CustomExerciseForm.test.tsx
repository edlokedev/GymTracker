import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CustomExerciseForm from './CustomExerciseForm'

const createMock = vi.hoisted(() => vi.fn())
const updateMock = vi.hoisted(() => vi.fn())
const uploadMock = vi.hoisted(() => vi.fn())

vi.mock('../client', () => ({
  createCustomExercise: createMock,
  updateCustomExercise: updateMock,
  uploadCustomExerciseImage: uploadMock,
}))

const categories = [
  { id: 'strength', name: 'Strength' },
  { id: 'cardio', name: 'Cardio' },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderForm(overrides: Partial<React.ComponentProps<typeof CustomExerciseForm>> = {}) {
  const onSaved = vi.fn()
  const onClose = vi.fn()
  render(
    <CustomExerciseForm
      isOpen
      onClose={onClose}
      categories={categories}
      userId="user-1"
      onSaved={onSaved}
      {...overrides}
    />,
  )
  return { onSaved, onClose }
}

describe('CustomExerciseForm', () => {
  it('blocks submit and shows an error when the name is empty', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }))

    expect(await screen.findByText('Name is required')).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates an exercise from a valid form and reports it', async () => {
    const created = { id: 'custom-1', name: 'Pendlay Row' }
    createMock.mockResolvedValue(created)
    const { onSaved, onClose } = renderForm()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pendlay Row' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText(/Primary muscles/), { target: { value: 'back, lats' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    const payload = createMock.mock.calls[0][0]
    expect(payload.name).toBe('Pendlay Row')
    expect(payload.category_id).toBe('strength')
    expect(payload.primary_muscles).toEqual(['back', 'lats'])
    expect(uploadMock).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledWith(created)
    expect(onClose).toHaveBeenCalled()
  })

  it('edits an existing custom exercise via update', async () => {
    updateMock.mockResolvedValue({ id: 'custom-9', name: 'Renamed' })
    const initial = {
      id: 'custom-9',
      name: 'Old Name',
      category_id: 'strength',
      tracking_type: 'strength' as const,
      primary_muscles: [],
      secondary_muscles: [],
      instructions: [],
      gif_path: null,
      preview_image_path: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    renderForm({ initial })

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock.mock.calls[0][0]).toBe('custom-9')
    expect(createMock).not.toHaveBeenCalled()
  })
})
