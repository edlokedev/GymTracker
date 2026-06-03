import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SetEntry from './SetEntry'

describe('SetEntry', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders inline validation instead of alerting for invalid input', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onSave = vi.fn()

    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save Set' }))

    expect(alertSpy).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid number of reps.')
  })

  it('submits parsed set data for valid strength input', async () => {
    const onSave = vi.fn(async () => ({
      id: 'set-1',
      workout_id: 'session-1',
      exercise_id: 'bench-press',
      set_number: 1,
      reps: 8,
      weight: 100,
      created_at: new Date('2026-05-01T10:00:00.000Z'),
      updated_at: new Date('2026-05-01T10:00:00.000Z'),
    }))

    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Reps *'), {
      target: { value: '8' },
    })
    fireEvent.change(screen.getByLabelText('Weight (kg)'), {
      target: { value: '100' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Set' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        workout_id: 'session-1',
        exercise_id: 'bench-press',
        set_order: 1,
        reps: 8,
        weight: 100,
        rest_time: undefined,
        notes: undefined,
      }),
    )
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })

  it('does not render a redundant copy button when values are already prefilled', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={2}
        trackingType="strength"
        previousSet={{
          id: 'set-1',
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_number: 1,
          reps: 8,
          weight: 100,
          rest_time: 90,
          notes: 'do not carry this forward',
          created_at: new Date('2026-05-01T10:00:00.000Z'),
          updated_at: new Date('2026-05-01T10:00:00.000Z'),
        }}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Reps *')).toHaveValue(8)
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(100)
    expect(screen.getByLabelText('Rest Time (seconds)')).toHaveValue(90)
    expect(screen.getByLabelText('Notes')).toHaveValue('')
    expect(screen.queryByRole('button', { name: /same as last/i })).not.toBeInTheDocument()
  })

  it('prefills new sets from the previous set without copying notes', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={2}
        trackingType="strength"
        previousSet={{
          id: 'set-1',
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_number: 1,
          reps: 8,
          weight: 100,
          rest_time: 90,
          notes: 'skip this',
          created_at: new Date('2026-05-01T10:00:00.000Z'),
          updated_at: new Date('2026-05-01T10:00:00.000Z'),
        }}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Reps *')).toHaveValue(8)
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(100)
    expect(screen.getByLabelText('Rest Time (seconds)')).toHaveValue(90)
    expect(screen.getByLabelText('Notes')).toHaveValue('')
  })

  it('increments and decrements strength values without going invalid', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Increase reps by 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase reps by 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease reps by 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease reps by 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease reps by 1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Increase weight by 2.5 kilograms' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease weight by 2.5 kilograms' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease weight by 2.5 kilograms' }))

    expect(screen.getByLabelText('Reps *')).toHaveValue(1)
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(0)
  })

  it('hides inline new-set actions on mobile when sticky actions own saving', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        useStickyMobileActions
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save Set' }).parentElement).toHaveClass('hidden')
  })
})
