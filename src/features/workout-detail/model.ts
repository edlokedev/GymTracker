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

export type WorkoutSetMetricKey = 'weight' | 'reps' | 'duration' | 'distance' | 'incline' | 'speed'

export interface WorkoutSetMetricColumn {
  key: WorkoutSetMetricKey
  label: string
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

function formatSetDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

export function getWorkoutSetMetricColumns(sets: WorkoutSet[]): WorkoutSetMetricColumn[] {
  const hasTimedMetrics = sets.some((set) => set.durationSeconds !== undefined)
  if (!hasTimedMetrics) {
    return [
      { key: 'weight', label: 'Weight' },
      { key: 'reps', label: 'Reps' },
    ]
  }

  const columns: WorkoutSetMetricColumn[] = [{ key: 'duration', label: 'Duration' }]
  if (sets.some((set) => set.distanceKm !== undefined))
    columns.push({ key: 'distance', label: 'Distance' })
  if (sets.some((set) => set.incline !== undefined))
    columns.push({ key: 'incline', label: 'Incline' })
  if (sets.some((set) => set.speedKmh !== undefined)) columns.push({ key: 'speed', label: 'Speed' })
  return columns
}

export function getWorkoutSetMetricValue(set: WorkoutSet, key: WorkoutSetMetricKey): string {
  switch (key) {
    case 'duration':
      return set.durationSeconds !== undefined ? formatSetDuration(set.durationSeconds) : '-'
    case 'distance':
      return set.distanceKm !== undefined ? `${set.distanceKm} km` : '-'
    case 'incline':
      return set.incline !== undefined ? String(set.incline) : '-'
    case 'speed':
      return set.speedKmh !== undefined ? `${set.speedKmh} km/h` : '-'
    case 'weight':
      return `${set.weight} kg`
    case 'reps':
      return String(set.reps)
  }
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
