import type {
  ExerciseWithParsedFields,
  WorkoutSession,
  WorkoutSet,
  WorkoutWithDetails,
} from '@/lib/types/database'

export interface ExerciseInWorkout {
  exercise: ExerciseWithParsedFields
  sets: WorkoutSet[]
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type WorkoutDetailExercise = WorkoutWithDetails['exercises'][number]['exercise'] &
  Partial<ExerciseWithParsedFields>

export function mapWorkoutDetailsToExercises(workout: WorkoutWithDetails): ExerciseInWorkout[] {
  return workout.exercises.map((exerciseInWorkout) => {
    const exercise = exerciseInWorkout.exercise as WorkoutDetailExercise

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        category_id: exercise.category_id || '',
        category_name: exercise.category_name,
        tracking_type: exercise.tracking_type ?? 'strength',
        force: exercise.force ?? null,
        level: exercise.level,
        mechanic: exercise.mechanic ?? null,
        equipment: exercise.equipment || '',
        primary_muscles: exercise.primary_muscles || [],
        secondary_muscles: exercise.secondary_muscles || [],
        instructions: exercise.instructions || [],
        gif_path: exercise.gif_path ?? null,
        preview_image_path: exercise.preview_image_path ?? null,
        created_at: exercise.created_at || new Date(),
        updated_at: exercise.updated_at || new Date(),
      },
      sets: exerciseInWorkout.sets,
    }
  })
}

export function getTotalSets(exercises: ExerciseInWorkout[]): number {
  return exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

export function getTotalVolume(exercises: ExerciseInWorkout[]): number {
  return exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce((exerciseTotal, set) => {
        return exerciseTotal + (set.weight || 0) * (set.reps || 0)
      }, 0),
    0,
  )
}

export function getNextSetNumber(sets: WorkoutSet[]): number {
  return sets.reduce((maxSetNumber, set) => Math.max(maxSetNumber, set.set_number), 0) + 1
}

export function getSessionDuration(
  session: WorkoutSession | null,
  now = new Date(),
): string | null {
  if (!session?.start_time) return null

  const start = new Date(session.start_time)
  const end = session.end_time ? new Date(session.end_time) : now
  const durationMs = end.getTime() - start.getTime()
  const minutes = Math.floor(durationMs / (1000 * 60))

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function hasExerciseInWorkout(exercises: ExerciseInWorkout[], exerciseId: string): boolean {
  return exercises.some((exercise) => exercise.exercise.id === exerciseId)
}

export function addExerciseToWorkout(
  exercises: ExerciseInWorkout[],
  exercise: ExerciseWithParsedFields,
): { exercises: ExerciseInWorkout[]; added: boolean } {
  if (hasExerciseInWorkout(exercises, exercise.id)) {
    return { exercises, added: false }
  }

  return {
    exercises: [...exercises, { exercise, sets: [] }],
    added: true,
  }
}

export function removeExerciseFromWorkout(
  exercises: ExerciseInWorkout[],
  exerciseId: string,
): ExerciseInWorkout[] {
  return exercises.filter((exercise) => exercise.exercise.id !== exerciseId)
}

export function appendSetToExercise(
  exercises: ExerciseInWorkout[],
  exerciseId: string,
  set: WorkoutSet,
): ExerciseInWorkout[] {
  return exercises.map((exercise) => {
    if (exercise.exercise.id !== exerciseId) return exercise
    return { ...exercise, sets: [...exercise.sets, set] }
  })
}

export function replaceSetInExercise(
  exercises: ExerciseInWorkout[],
  exerciseId: string,
  setId: string,
  updatedSet: WorkoutSet,
): ExerciseInWorkout[] {
  return exercises.map((exercise) => {
    if (exercise.exercise.id !== exerciseId) return exercise
    return {
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? updatedSet : set)),
    }
  })
}

export function removeSetFromExercise(
  exercises: ExerciseInWorkout[],
  exerciseId: string,
  setId: string,
): ExerciseInWorkout[] {
  return exercises.map((exercise) => {
    if (exercise.exercise.id !== exerciseId) return exercise
    return {
      ...exercise,
      sets: exercise.sets.filter((set) => set.id !== setId),
    }
  })
}
