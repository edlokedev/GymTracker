import { describe, expect, it } from 'vitest'
import type { WorkoutDetailWorkout } from './model'
import {
  calculateSetVolume,
  calculateWorkoutVolume,
  formatWorkoutDetailDate,
  formatWorkoutDuration,
  getWorkoutDetailLabel,
  getWorkoutTotalVolume,
  groupWorkoutSetsByExercise,
} from './model'

const workout: WorkoutDetailWorkout = {
  id: 'workout-1',
  userId: 'user-1',
  date: '2026-04-25T00:00:00.000Z',
  duration: 75,
  notes: 'Good session',
  totalVolume: 570,
  exerciseCount: 2,
  sets: [
    {
      id: 'set-1',
      sessionId: 'workout-1',
      exerciseId: 'exercise-1',
      setNumber: 1,
      exerciseName: 'machine inner chest press',
      reps: 10,
      weight: 30,
    },
    {
      id: 'set-2',
      sessionId: 'workout-1',
      exerciseId: 'exercise-1',
      setNumber: 2,
      exerciseName: 'machine inner chest press',
      reps: 8,
      weight: 30,
      notes: 'Hard',
    },
    {
      id: 'set-3',
      sessionId: 'workout-1',
      exerciseId: 'exercise-2',
      setNumber: 1,
      reps: 12,
      weight: 10,
    },
  ],
}

describe('workout detail model', () => {
  it('formats dates and durations for the modal summary', () => {
    expect(formatWorkoutDetailDate(new Date('2026-04-25T00:00:00.000Z'))).toBe(
      'Saturday, April 25, 2026',
    )
    expect(formatWorkoutDuration(undefined)).toBe('-')
    expect(formatWorkoutDuration(45)).toBe('45m')
    expect(formatWorkoutDuration(75)).toBe('1h 15m')
    expect(formatWorkoutDuration(120)).toBe('2h')
  })

  it('groups sets by exercise and keeps set order', () => {
    expect(groupWorkoutSetsByExercise(workout.sets)).toEqual([
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Machine Inner Chest Press',
        sets: [workout.sets[0], workout.sets[1]],
      },
      {
        exerciseId: 'exercise-2',
        exerciseName: 'Unknown Exercise',
        sets: [workout.sets[2]],
      },
    ])
  })

  it('calculates set, workout, and fallback total volume', () => {
    expect(calculateSetVolume(workout.sets[0])).toBe(300)
    expect(calculateWorkoutVolume(workout.sets)).toBe(660)
    expect(getWorkoutTotalVolume(workout)).toBe(570)
    expect(getWorkoutTotalVolume({ ...workout, totalVolume: undefined })).toBe(660)
  })

  it('builds delete dialog labels from name or date', () => {
    expect(getWorkoutDetailLabel({ ...workout, name: ' Push Day ' })).toBe('Push Day')
    expect(getWorkoutDetailLabel(workout)).toBe('workout from Saturday, April 25, 2026')
    expect(getWorkoutDetailLabel(null)).toBe('this workout')
  })
})
