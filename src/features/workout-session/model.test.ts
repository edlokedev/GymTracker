import { describe, expect, it } from 'vitest'
import type { ExerciseWithParsedFields, WorkoutSet, WorkoutWithDetails } from '@/lib/types/database'
import { makeExerciseFixture } from './__fixtures__/exercise'
import {
  addExerciseToWorkout,
  getActiveExerciseId,
  getNextActiveExerciseId,
  getNextSetDefaultsFromPreviousSet,
  getNextSetNumber,
  getSessionDuration,
  getTotalSets,
  getTotalVolume,
  hasExerciseInWorkout,
  mapWorkoutDetailsToExercises,
} from './model'

const makeSet = (id: string, setNumber: number, weight: number, reps: number): WorkoutSet => ({
  id,
  workout_id: 'session-1',
  exercise_id: 'bench-press',
  set_number: setNumber,
  weight,
  reps,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
})

const makeExercise = (id: string, name: string): ExerciseWithParsedFields => ({
  id,
  name,
  category_id: 'strength',
  category_name: 'Strength',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  gif_path: null,
  preview_image_path: null,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
})

describe('workout session model', () => {
  it('maps workout details into exercise groups', () => {
    const workout: WorkoutWithDetails = {
      id: 'session-1',
      user_id: 'user-1',
      date: '2026-05-01',
      start_time: '2026-05-01T10:00:00.000Z',
      created_at: new Date('2026-05-01T10:00:00.000Z'),
      updated_at: new Date('2026-05-01T10:00:00.000Z'),
      exercises: [
        {
          exercise: makeExerciseFixture({
            id: 'bench-press',
            name: 'Bench Press',
            primary_muscles: ['chest'],
            equipment: 'barbell',
            category_name: 'Strength',
            gif_path: null,
            preview_image_path: null,
          }),
          sets: [makeSet('set-1', 1, 100, 5)],
        },
      ],
    }

    expect(mapWorkoutDetailsToExercises(workout)).toEqual([
      {
        exercise: expect.objectContaining({
          id: 'bench-press',
          name: 'Bench Press',
          category_name: 'Strength',
          primary_muscles: ['chest'],
          secondary_muscles: [],
          instructions: [],
        }),
        sets: [makeSet('set-1', 1, 100, 5)],
      },
    ])
  })

  it('computes workout totals and set numbers', () => {
    const exercises = [
      {
        exercise: makeExercise('bench-press', 'Bench Press'),
        sets: [makeSet('set-1', 1, 100, 5), makeSet('set-2', 2, 80, 10)],
      },
    ]

    expect(getTotalSets(exercises)).toBe(2)
    expect(getTotalVolume(exercises)).toBe(1300)
    expect(getNextSetNumber(exercises[0].sets)).toBe(3)
  })

  it('formats session duration', () => {
    expect(
      getSessionDuration(
        {
          id: 'session-1',
          user_id: 'user-1',
          date: '2026-05-01',
          start_time: '2026-05-01T10:00:00.000Z',
          end_time: '2026-05-01T11:35:00.000Z',
          created_at: new Date('2026-05-01T10:00:00.000Z'),
          updated_at: new Date('2026-05-01T10:00:00.000Z'),
        },
        new Date('2026-05-01T12:00:00.000Z'),
      ),
    ).toBe('1h 35m')
  })

  it('detects duplicate exercise add', () => {
    const exercises = [{ exercise: makeExercise('bench-press', 'Bench Press'), sets: [] }]
    const duplicate = makeExercise('bench-press', 'Bench Press')
    const newExercise = makeExercise('squat', 'Squat')

    expect(hasExerciseInWorkout(exercises, duplicate.id)).toBe(true)
    expect(addExerciseToWorkout(exercises, duplicate)).toEqual({
      exercises,
      added: false,
    })
    expect(addExerciseToWorkout(exercises, newExercise)).toEqual({
      exercises: [...exercises, { exercise: newExercise, sets: [] }],
      added: true,
    })
  })

  it('resolves active exercise and advances past completed exercises', () => {
    const exercises = [
      { exercise: makeExercise('bench-press', 'Bench Press'), sets: [] },
      { exercise: makeExercise('squat', 'Squat'), sets: [] },
      { exercise: makeExercise('row', 'Row'), sets: [] },
    ]

    expect(getActiveExerciseId(exercises, null)).toBe('bench-press')
    expect(getActiveExerciseId(exercises, 'squat')).toBe('squat')
    expect(getActiveExerciseId(exercises, 'missing')).toBe('bench-press')
    expect(getNextActiveExerciseId(exercises, 'bench-press', new Set(['squat']))).toBe('row')
    expect(getNextActiveExerciseId(exercises, 'row', new Set(['bench-press', 'squat']))).toBeNull()
  })

  it('does not fall back to a completed exercise when the current exercise is gone', () => {
    const exercises = [
      { exercise: makeExercise('bench-press', 'Bench Press'), sets: [] },
      { exercise: makeExercise('row', 'Row'), sets: [] },
    ]

    expect(getNextActiveExerciseId(exercises, 'squat', new Set(['bench-press']))).toBe('row')
    expect(getNextActiveExerciseId(exercises, 'squat', new Set(['bench-press', 'row']))).toBeNull()
  })

  it('derives next set defaults from the previous set without notes', () => {
    expect(
      getNextSetDefaultsFromPreviousSet({
        ...makeSet('set-1', 1, 100, 8),
        rest_time: 90,
        notes: 'do not copy',
      }),
    ).toEqual({
      reps: 8,
      weight: 100,
      rest_time: 90,
      duration_seconds: undefined,
      distance_km: undefined,
      incline: undefined,
      speed_kmh: undefined,
    })
  })
})
