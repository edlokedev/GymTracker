import { z } from 'zod'
import { defineContract } from '../define-contract'

const nextWorkoutRecommendation = z.object({
  type: z.enum(['template', 'repeat-last', 'starter', 'empty']),
  title: z.string(),
  reason: z.string(),
  ctaLabel: z.string(),
  templateId: z.string().optional(),
  sessionId: z.string().optional(),
})

export const nextWorkoutContract = defineContract({
  path: '/api/next-workout',
  methods: {
    GET: {
      query: z.object({}),
      response: z.object({ recommendation: nextWorkoutRecommendation }),
    },
  },
})

export { nextWorkoutRecommendation }
