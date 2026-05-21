import { describe, expect, it } from 'vitest'
import { buildWorkoutSetInput, formatSetRestTime } from './setEntry'

const validValues = {
  reps: '8',
  weight: '100.5',
  restTime: '90',
  notes: '  controlled tempo  ',
}

describe('set entry model', () => {
  it('builds workout set input from valid form values', () => {
    expect(
      buildWorkoutSetInput({
        exerciseId: 'bench-press',
        workoutId: 'session-1',
        setNumber: 2,
        values: validValues,
      }),
    ).toEqual({
      ok: true,
      data: {
        workout_id: 'session-1',
        exercise_id: 'bench-press',
        set_order: 2,
        reps: 8,
        weight: 100.5,
        rest_time: 90,
        notes: 'controlled tempo',
      },
    })
  })

  it('rejects invalid reps, weight, rest time, and missing context', () => {
    expect(
      buildWorkoutSetInput({
        exerciseId: 'bench-press',
        workoutId: 'session-1',
        setNumber: 1,
        values: { ...validValues, reps: '0' },
      }),
    ).toMatchObject({ ok: false, error: 'invalid-reps' })

    expect(
      buildWorkoutSetInput({
        exerciseId: 'bench-press',
        workoutId: 'session-1',
        setNumber: 1,
        values: { ...validValues, weight: '-1' },
      }),
    ).toMatchObject({ ok: false, error: 'invalid-weight' })

    expect(
      buildWorkoutSetInput({
        exerciseId: 'bench-press',
        workoutId: 'session-1',
        setNumber: 1,
        values: { ...validValues, restTime: '-5' },
      }),
    ).toMatchObject({ ok: false, error: 'invalid-rest-time' })

    expect(
      buildWorkoutSetInput({
        setNumber: 1,
        values: validValues,
      }),
    ).toMatchObject({ ok: false, error: 'missing-workout-context' })
  })

  it('formats rest time for display', () => {
    expect(formatSetRestTime(45)).toBe('45s')
    expect(formatSetRestTime(60)).toBe('1m')
    expect(formatSetRestTime(75)).toBe('1m 15s')
  })
})
