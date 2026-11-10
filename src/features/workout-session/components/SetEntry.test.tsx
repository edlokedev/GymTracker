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
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('100')
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
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('100')
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
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('0')
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

  const savedSet = {
    id: 'set-1',
    workout_id: 'session-1',
    exercise_id: 'bench-press',
    set_number: 1,
    reps: 8,
    weight: 100,
    rest_time: 90,
    notes: 'tempo',
    created_at: new Date('2026-05-01T10:00:00.000Z'),
    updated_at: new Date('2026-05-01T10:00:00.000Z'),
  }

  // I1: JSON drops undefined, so a cleared field must travel as null.
  it('sends null for cleared optional fields when updating an existing set', async () => {
    const onSave = vi.fn(async () => savedSet)

    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        existingSet={savedSet}
        setNumber={1}
        trackingType="strength"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Rest Time (seconds)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Set' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        workout_id: 'session-1',
        exercise_id: 'bench-press',
        set_order: 1,
        reps: 8,
        weight: null,
        rest_time: null,
        notes: null,
      }),
    )
  })

  // I4: the sticky bar bumps submitSignal on every tap; a double tap must not
  // fire a second POST (unique-constraint error after a successful save).
  it('ignores a second save while the first is still in flight', async () => {
    let resolveSave: (value: typeof savedSet) => void = () => {}
    const onSave = vi.fn(
      () =>
        new Promise<typeof savedSet>((resolve) => {
          resolveSave = resolve
        }),
    )
    const renderEntry = (submitSignal: number) => (
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        isActiveEntry
        submitSignal={submitSignal}
        useStickyMobileActions
        onSave={onSave}
      />
    )
    const { rerender } = render(renderEntry(0))
    fireEvent.change(screen.getByLabelText('Reps *'), { target: { value: '8' } })

    rerender(renderEntry(1))
    rerender(renderEntry(2))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    resolveSave(savedSet)
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  // I6: comma-decimal locales.
  it('renders decimal fields as text inputs with a decimal keypad', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={vi.fn()}
      />,
    )

    const weight = screen.getByLabelText('Weight (kg)')
    expect(weight).toHaveAttribute('type', 'text')
    expect(weight).toHaveAttribute('inputmode', 'decimal')
  })

  it('saves a comma-decimal weight instead of dropping it', async () => {
    const onSave = vi.fn(async () => savedSet)

    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Reps *'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '62,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Set' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ weight: 62.5 })),
    )
  })

  it('steps a comma-decimal weight from its numeric value', () => {
    render(
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        onSave={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '62,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight by 2.5 kilograms' }))

    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('65')
  })

  // Issue #0027: the last-performance prefill arrives asynchronously, after the
  // entry is already on screen.
  describe('late last-performance prefill', () => {
    const lastPerformance = {
      id: 'history-1',
      workout_id: '',
      exercise_id: 'bench-press',
      set_number: 1,
      reps: 8,
      weight: 100,
      created_at: new Date('2026-05-01T10:00:00.000Z'),
      updated_at: new Date('2026-05-01T10:00:00.000Z'),
    }
    const renderEntry = (previousSet?: typeof lastPerformance) => (
      <SetEntry
        exerciseId="bench-press"
        workoutId="session-1"
        setNumber={1}
        trackingType="strength"
        previousSet={previousSet}
        onSave={vi.fn()}
      />
    )

    it('fills an untouched entry when the prefill arrives', () => {
      const { rerender } = render(renderEntry())

      rerender(renderEntry(lastPerformance))

      expect(screen.getByLabelText('Reps *')).toHaveValue(8)
      expect(screen.getByLabelText('Weight (kg)')).toHaveValue('100')
    })

    it('keeps values the user already typed when the prefill arrives', () => {
      const { rerender } = render(renderEntry())
      fireEvent.change(screen.getByLabelText('Reps *'), { target: { value: '5' } })

      rerender(renderEntry(lastPerformance))

      expect(screen.getByLabelText('Reps *')).toHaveValue(5)
      expect(screen.getByLabelText('Weight (kg)')).toHaveValue('')
    })
  })
})
