import { getNextWorkoutRecommendation } from '@/features/workout-templates/model'
import { assertPostgresOk } from '../../api/errors'
import type {
  ExerciseWithParsedFields,
  NextWorkoutResponse,
  StartFromTemplateResult,
  WorkoutSession,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutTemplateWithExercises,
} from '../../types/database'
import { type AppSupabaseClient, queryClient } from '../query-client'
import { type CatalogExercise, EXERCISE_SELECT, mapExerciseRow } from './exercise-catalog'
import { workoutSessionQueries } from './workout-sessions'

type SB = AppSupabaseClient

type TemplateRow = {
  id: string
  user_id: string
  name: string
  notes: string | null
  source_session_id: string | null
  is_archived: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

type TemplateExerciseRow = {
  id: string
  template_id: string
  exercise_id: string
  position: number
  target_sets: number | null
  notes: string | null
  created_at: string
}

type SetRow = {
  exercise_id: string
  set_number: number
  created_at: string
}

export interface CreateWorkoutTemplateInput {
  name?: string
  notes?: string
  sourceSessionId?: string
  exercises?: {
    exerciseId: string
    targetSets?: number
    notes?: string
  }[]
}

export type UpdateWorkoutTemplateInput = Partial<CreateWorkoutTemplateInput> & {
  is_archived?: boolean
}

const TEMPLATE_COLUMNS =
  'id, user_id, name, notes, source_session_id, is_archived, last_used_at, created_at, updated_at'
const TEMPLATE_EXERCISE_COLUMNS =
  'id, template_id, exercise_id, position, target_sets, notes, created_at'

function mapTemplate(row: TemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    notes: row.notes ?? undefined,
    source_session_id: row.source_session_id ?? undefined,
    is_archived: row.is_archived,
    last_used_at: row.last_used_at ?? undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }
}

function mapTemplateExercise(row: TemplateExerciseRow): WorkoutTemplateExercise {
  return {
    id: row.id,
    template_id: row.template_id,
    exercise_id: row.exercise_id,
    position: row.position,
    target_sets: row.target_sets ?? undefined,
    notes: row.notes ?? undefined,
    created_at: new Date(row.created_at),
  }
}

function mapCatalogExercise(exercise: CatalogExercise): ExerciseWithParsedFields {
  return {
    ...exercise,
    force: exercise.force as ExerciseWithParsedFields['force'],
    level: exercise.level as ExerciseWithParsedFields['level'],
    mechanic: exercise.mechanic as ExerciseWithParsedFields['mechanic'],
    equipment: exercise.equipment ?? '',
    created_at: new Date(exercise.created_at),
    updated_at: new Date(exercise.updated_at),
  }
}

async function hydrateTemplateExercises(
  supabase: SB,
  templates: WorkoutTemplate[],
): Promise<WorkoutTemplateWithExercises[]> {
  if (templates.length === 0) return []

  const templateIds = templates.map((template) => template.id)
  const { data: exerciseRows, error: templateExercisesError } = await queryClient(supabase)
    .from('workout_template_exercises')
    .select(TEMPLATE_EXERCISE_COLUMNS)
    .in('template_id', templateIds)
    .order('position', { ascending: true })

  assertPostgresOk(templateExercisesError)

  const templateExercises = ((exerciseRows ?? []) as TemplateExerciseRow[]).map(mapTemplateExercise)
  const exerciseIds = Array.from(new Set(templateExercises.map((row) => row.exercise_id)))

  let exercises: ExerciseWithParsedFields[] = []
  if (exerciseIds.length > 0) {
    const { data, error } = await queryClient(supabase)
      .from('exercises')
      .select(EXERCISE_SELECT)
      .in('id', exerciseIds)
    assertPostgresOk(error)
    exercises = ((data ?? []) as Parameters<typeof mapExerciseRow>[0][])
      .map(mapExerciseRow)
      .map(mapCatalogExercise)
  }

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const templateExercisesByTemplateId = new Map<string, WorkoutTemplateExercise[]>()
  for (const templateExercise of templateExercises) {
    const bucket = templateExercisesByTemplateId.get(templateExercise.template_id) ?? []
    bucket.push(templateExercise)
    templateExercisesByTemplateId.set(templateExercise.template_id, bucket)
  }

  return templates.map((template) => ({
    ...template,
    exercises: (templateExercisesByTemplateId.get(template.id) ?? [])
      .map((templateExercise) => {
        const exercise = exerciseById.get(templateExercise.exercise_id)
        if (!exercise) return null
        return { templateExercise, exercise }
      })
      .filter((item): item is WorkoutTemplateWithExercises['exercises'][number] => Boolean(item)),
  }))
}

async function getRecentSessions(supabase: SB, limit = 1): Promise<WorkoutSession[]> {
  const sessions = await workoutSessionQueries.list(supabase, limit, 0)
  return sessions.data
}

async function readTemplateExercisesFromSession(
  supabase: SB,
  userId: string,
  sourceSessionId: string,
): Promise<{
  source: WorkoutSession
  exercises: NonNullable<CreateWorkoutTemplateInput['exercises']>
}> {
  const source = await workoutSessionQueries.getById(supabase, sourceSessionId)
  if (!source || source.user_id !== userId) {
    return { source: null as never, exercises: [] }
  }

  const { data, error } = await queryClient(supabase)
    .from('workout_sets')
    .select('exercise_id, set_number, created_at')
    .eq('workout_id', sourceSessionId)
    .order('set_number', { ascending: true })
    .order('created_at', { ascending: true })
  assertPostgresOk(error)

  const byExercise = new Map<string, { exerciseId: string; targetSets: number }>()
  for (const set of (data ?? []) as SetRow[]) {
    const item = byExercise.get(set.exercise_id) ?? { exerciseId: set.exercise_id, targetSets: 0 }
    item.targetSets += 1
    byExercise.set(set.exercise_id, item)
  }

  return { source, exercises: Array.from(byExercise.values()) }
}

export const workoutTemplateQueries = {
  async list(supabase: SB): Promise<WorkoutTemplateWithExercises[]> {
    const { data, error } = await queryClient(supabase)
      .from('workout_templates')
      .select(TEMPLATE_COLUMNS)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    assertPostgresOk(error)
    return hydrateTemplateExercises(supabase, ((data ?? []) as TemplateRow[]).map(mapTemplate))
  },

  async getById(supabase: SB, id: string): Promise<WorkoutTemplateWithExercises | null> {
    const { data, error } = await queryClient(supabase)
      .from('workout_templates')
      .select(TEMPLATE_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    assertPostgresOk(error)
    if (!data) return null
    const [template] = await hydrateTemplateExercises(supabase, [mapTemplate(data as TemplateRow)])
    return template ?? null
  },

  async create(
    supabase: SB,
    userId: string,
    input: CreateWorkoutTemplateInput,
  ): Promise<WorkoutTemplateWithExercises | null> {
    let exercises = input.exercises ?? []
    let sourceSession: WorkoutSession | null = null

    if (input.sourceSessionId) {
      const sourceData = await readTemplateExercisesFromSession(
        supabase,
        userId,
        input.sourceSessionId,
      )
      sourceSession = sourceData.source
      if (!sourceSession) return null
      exercises = sourceData.exercises
    }

    const { data: row, error } = await queryClient(supabase)
      .from('workout_templates')
      .insert({
        user_id: userId,
        name: input.name?.trim() || sourceSession?.name?.trim() || 'Workout Template',
        notes: input.notes ?? sourceSession?.notes ?? null,
        source_session_id: input.sourceSessionId ?? null,
      })
      .select(TEMPLATE_COLUMNS)
      .single()

    assertPostgresOk(error)
    const template = mapTemplate(row as TemplateRow)

    if (exercises.length > 0) {
      const { error: insertExercisesError } = await queryClient(supabase)
        .from('workout_template_exercises')
        .insert(
          exercises.map((exercise, index) => ({
            template_id: template.id,
            exercise_id: exercise.exerciseId,
            position: index + 1,
            target_sets: exercise.targetSets ?? null,
            notes: exercise.notes ?? null,
          })),
        )
      assertPostgresOk(insertExercisesError)
    }

    return workoutTemplateQueries.getById(supabase, template.id)
  },

  async update(
    supabase: SB,
    id: string,
    input: UpdateWorkoutTemplateInput,
  ): Promise<WorkoutTemplateWithExercises | null> {
    const patch: Record<string, unknown> = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.is_archived !== undefined) patch.is_archived = input.is_archived

    if (Object.keys(patch).length > 0) {
      const { error } = await queryClient(supabase)
        .from('workout_templates')
        .update(patch)
        .eq('id', id)
      assertPostgresOk(error)
    }

    if (input.exercises) {
      const { error: deleteError } = await queryClient(supabase)
        .from('workout_template_exercises')
        .delete()
        .eq('template_id', id)
      assertPostgresOk(deleteError)

      if (input.exercises.length > 0) {
        const { error: insertError } = await queryClient(supabase)
          .from('workout_template_exercises')
          .insert(
            input.exercises.map((exercise, index) => ({
              template_id: id,
              exercise_id: exercise.exerciseId,
              position: index + 1,
              target_sets: exercise.targetSets ?? null,
              notes: exercise.notes ?? null,
            })),
          )
        assertPostgresOk(insertError)
      }
    }

    return workoutTemplateQueries.getById(supabase, id)
  },

  async archive(supabase: SB, id: string): Promise<boolean> {
    const { data, error } = await queryClient(supabase)
      .from('workout_templates')
      .update({ is_archived: true })
      .eq('id', id)
      .select('id')

    assertPostgresOk(error)
    return Array.isArray(data) && data.length > 0
  },

  async startFromTemplate(
    supabase: SB,
    userId: string,
    templateId: string,
  ): Promise<StartFromTemplateResult | null> {
    const template = await workoutTemplateQueries.getById(supabase, templateId)
    if (!template || template.is_archived) return null

    const session = await workoutSessionQueries.create(supabase, userId, {
      name: template.name,
      notes: template.notes,
    })

    const { error } = await queryClient(supabase)
      .from('workout_templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', template.id)
    assertPostgresOk(error)

    return { session, template }
  },

  async nextWorkout(supabase: SB): Promise<NextWorkoutResponse> {
    const [templates, recentSessions] = await Promise.all([
      workoutTemplateQueries.list(supabase),
      getRecentSessions(supabase, 1),
    ])

    return {
      recommendation: getNextWorkoutRecommendation({
        templates,
        recentSessions,
      }),
    }
  },
}
