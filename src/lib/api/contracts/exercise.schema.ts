import { z } from 'zod'

export const catalogExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category_id: z.string(),
  tracking_type: z.enum(['strength', 'cardio', 'timed']),
  force: z.string().nullable(),
  level: z.string().nullable(),
  mechanic: z.string().nullable(),
  equipment: z.string().nullable(),
  primary_muscles: z.array(z.string()),
  secondary_muscles: z.array(z.string()),
  instructions: z.array(z.string()),
  gif_path: z.string().nullable(),
  preview_image_path: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  category_name: z.string(),
})
