import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/workout-locations
// Returns the authenticated user's distinct past Workout Location names,
// sorted alphabetically. Used to populate autocomplete on session forms.
export const workoutLocationsContract = defineContract({
  path: '/api/workout-locations',
  methods: {
    GET: {
      query: z.object({}),
      response: z.array(z.string()),
    },
  },
})
