import type { WorkoutWithDetails } from '@/lib/types/database'

type ExerciseFixture = WorkoutWithDetails['exercises'][number]['exercise']

const defaultDate = new Date('2026-05-01T10:00:00.000Z')

export function makeExerciseFixture(overrides: Partial<ExerciseFixture> = {}): ExerciseFixture {
  return {
    id: 'bench-press',
    name: 'Bench Press',
    primary_muscles: ['chest'],
    secondary_muscles: [],
    instructions: [],
    equipment: 'barbell',
    category_id: 'strength',
    category_name: 'Strength',
    force: null,
    level: null,
    mechanic: null,
    gif_path: null,
    preview_image_path: null,
    created_at: defaultDate,
    updated_at: defaultDate,
    ...overrides,
  }
}
