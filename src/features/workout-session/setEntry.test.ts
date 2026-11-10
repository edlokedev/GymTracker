import { describe, expect, it } from 'vitest'
import { buildWorkoutSetInput, formatSetRestTime } from './setEntry'

const strengthValues = {
  reps: '8',
  weight: '100.5',
  durationMin: '',
  distanceKm: '',
  incline: '',
  speedKmh: '',
  durationSec: '',
  restTime: '90',
  notes: '  controlled tempo  ',
}

describe('set entry model', () => {
  describe('strength tracking', () => {
    it('builds workout set input from valid form values', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 2,
          trackingType: 'strength',
          values: strengthValues,
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
          trackingType: 'strength',
          values: { ...strengthValues, reps: '0' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-reps' })

      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'strength',
          values: { ...strengthValues, reps: '1.5' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-reps' })

      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'strength',
          values: { ...strengthValues, weight: '-1' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-weight' })

      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'strength',
          values: { ...strengthValues, restTime: '-5' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-rest-time' })

      expect(
        buildWorkoutSetInput({
          setNumber: 1,
          trackingType: 'strength',
          values: strengthValues,
        }),
      ).toMatchObject({ ok: false, error: 'missing-workout-context' })
    })
  })

  describe('cardio tracking', () => {
    const cardioValues = {
      reps: '',
      weight: '',
      durationMin: '30',
      distanceKm: '3.5',
      incline: '5',
      speedKmh: '7',
      durationSec: '',
      restTime: '',
      notes: '',
    }

    it('builds cardio set input', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'treadmill',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'cardio',
          values: cardioValues,
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'treadmill',
          set_order: 1,
          duration_seconds: 1800,
          distance_km: 3.5,
          incline: 5,
          speed_kmh: 7,
          rest_time: undefined,
          notes: undefined,
        },
      })
    })

    it('allows zero-valued optional cardio metrics', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'treadmill',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'cardio',
          values: {
            ...cardioValues,
            distanceKm: '0',
            incline: '0',
            speedKmh: '0',
          },
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'treadmill',
          set_order: 1,
          duration_seconds: 1800,
          distance_km: 0,
          incline: 0,
          speed_kmh: 0,
          rest_time: undefined,
          notes: undefined,
        },
      })
    })

    it('rejects missing duration', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'treadmill',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'cardio',
          values: { ...cardioValues, durationMin: '' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-duration' })
    })
  })

  describe('timed tracking', () => {
    const timedValues = {
      reps: '',
      weight: '',
      durationMin: '',
      distanceKm: '',
      incline: '',
      speedKmh: '',
      durationSec: '60',
      restTime: '',
      notes: '',
    }

    it('builds timed set input', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'plank',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'timed',
          values: timedValues,
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'plank',
          set_order: 1,
          duration_seconds: 60,
          rest_time: undefined,
          notes: undefined,
        },
      })
    })
  })

  describe('clearing fields on update', () => {
    const base = { exerciseId: 'bench-press', workoutId: 'session-1', setNumber: 2 }

    it('sends null for cleared optional strength fields when updating', () => {
      expect(
        buildWorkoutSetInput({
          ...base,
          trackingType: 'strength',
          forUpdate: true,
          values: { ...strengthValues, weight: '', restTime: '', notes: '  ' },
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_order: 2,
          reps: 8,
          weight: null,
          rest_time: null,
          notes: null,
        },
      })
    })

    it('sends null for cleared optional cardio fields when updating', () => {
      expect(
        buildWorkoutSetInput({
          ...base,
          trackingType: 'cardio',
          forUpdate: true,
          values: {
            ...strengthValues,
            reps: '',
            weight: '',
            durationMin: '30',
            distanceKm: '',
            incline: '',
            speedKmh: '',
            restTime: '',
            notes: '',
          },
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_order: 2,
          duration_seconds: 1800,
          distance_km: null,
          incline: null,
          speed_kmh: null,
          rest_time: null,
          notes: null,
        },
      })
    })

    it('keeps undefined (not null) for cleared fields when creating', () => {
      expect(
        buildWorkoutSetInput({
          ...base,
          trackingType: 'strength',
          values: { ...strengthValues, weight: '', restTime: '', notes: '' },
        }),
      ).toEqual({
        ok: true,
        data: {
          workout_id: 'session-1',
          exercise_id: 'bench-press',
          set_order: 2,
          reps: 8,
          weight: undefined,
          rest_time: undefined,
          notes: undefined,
        },
      })
    })
  })

  describe('comma decimals', () => {
    it('accepts a comma as the decimal separator', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'strength',
          values: { ...strengthValues, weight: '62,5' },
        }),
      ).toMatchObject({ ok: true, data: { weight: 62.5 } })
    })

    it('still rejects non-numeric weight', () => {
      expect(
        buildWorkoutSetInput({
          exerciseId: 'bench-press',
          workoutId: 'session-1',
          setNumber: 1,
          trackingType: 'strength',
          values: { ...strengthValues, weight: 'abc' },
        }),
      ).toMatchObject({ ok: false, error: 'invalid-weight' })
    })
  })

  it('formats rest time for display', () => {
    expect(formatSetRestTime(45)).toBe('45s')
    expect(formatSetRestTime(60)).toBe('1m')
    expect(formatSetRestTime(75)).toBe('1m 15s')
  })
})
