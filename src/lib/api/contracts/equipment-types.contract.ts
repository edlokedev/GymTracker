import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/equipment-types → string[] of distinct, sorted equipment names
// drawn from the exercise catalog. Public.
export const equipmentTypesContract = defineContract({
  path: '/api/equipment-types',
  methods: {
    GET: {
      response: z.array(z.string()),
    },
  },
})
