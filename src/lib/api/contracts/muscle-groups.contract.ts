import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/muscle-groups → distinct, sorted muscle names aggregated from
// every exercise's primary/secondary muscle arrays. Public.
export const muscleGroupsContract = defineContract({
  path: '/api/muscle-groups',
  methods: {
    GET: {
      response: z.array(z.string()),
    },
  },
})
