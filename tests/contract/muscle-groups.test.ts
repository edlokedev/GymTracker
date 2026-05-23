import { describe, expect, it } from 'vitest'
import { muscleGroupsContract } from '../../src/lib/api/contracts/muscle-groups.contract'
import { getMuscleGroups } from '../../src/routes/api.muscle-groups'
import { runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/muscle-groups', () => {
  it('returns the sorted union of primary + secondary muscles', async () => {
    const supabase = stubSupabase({
      exercises: [
        { id: '1', primary_muscles: ['chest'], secondary_muscles: ['triceps'] },
        { id: '2', primary_muscles: ['back'], secondary_muscles: ['biceps', 'chest'] },
        { id: '3', primary_muscles: ['legs'], secondary_muscles: [] },
      ],
    })
    const res = await runRoute({
      contract: muscleGroupsContract,
      method: 'GET',
      handler: getMuscleGroups,
      isPublic: true,
      supabase,
    })
    expect(res.status).toBe(200)
    const parsed = muscleGroupsContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toEqual(['back', 'biceps', 'chest', 'legs', 'triceps'])
  })
})
