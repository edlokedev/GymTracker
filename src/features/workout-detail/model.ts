import type { WorkoutSessionWithSets, WorkoutSet } from '@/lib/types/calendar'
import { formatExerciseName } from '@/lib/utils/text'

export type WorkoutDetailWorkout = Omit<
  WorkoutSessionWithSets,
  'exerciseCount' | 'totalVolume' | 'userId'
> & {
  exerciseCount?: number
  name?: string
  totalVolume?: number
  userId?: string
}

export interface ExerciseSetGroup {
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
}

export function formatWorkoutDetailDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatWorkoutSummaryDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US')
}

export function formatWorkoutDuration(minutes?: number): string {
  if (minutes === undefined) return '-'
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function calculateWorkoutVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0)
}

export function calculateSetVolume(set: WorkoutSet): number {
  return set.weight * set.reps
}

export function groupWorkoutSetsByExercise(sets: WorkoutSet[]): ExerciseSetGroup[] {
  const groups = new Map<string, ExerciseSetGroup>()

  sets.forEach((set) => {
    const existing = groups.get(set.exerciseId)

    if (existing) {
      existing.sets.push(set)
      return
    }

    groups.set(set.exerciseId, {
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName ? formatExerciseName(set.exerciseName) : 'Unknown Exercise',
      sets: [set],
    })
  })

  return Array.from(groups.values())
}

export function getWorkoutTotalVolume(workout: WorkoutDetailWorkout): number {
  return workout.totalVolume ?? calculateWorkoutVolume(workout.sets)
}

export function getWorkoutDetailLabel(workout: WorkoutDetailWorkout | null | undefined): string {
  if (!workout) return 'this workout'

  const workoutName = workout.name?.trim()
  if (workoutName) return workoutName

  return `workout from ${formatWorkoutDetailDate(new Date(workout.date))}`
}
