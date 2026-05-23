import { describe, expect, it } from 'vitest'
import { equipmentTypesContract } from '../../src/lib/api/contracts/equipment-types.contract'
import { getEquipmentTypes } from '../../src/routes/api.equipment-types'
import { runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/equipment-types', () => {
  it('returns sorted, deduped equipment names (happy path)', async () => {
    const supabase = stubSupabase({
      exercises: [
        { id: '1', equipment: 'barbell' },
        { id: '2', equipment: 'dumbbell' },
        { id: '3', equipment: 'barbell' },
        { id: '4', equipment: null },
        { id: '5', equipment: '' },
      ],
    })
    const res = await runRoute({
      contract: equipmentTypesContract,
      method: 'GET',
      handler: getEquipmentTypes,
      isPublic: true,
      supabase,
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const parsed = equipmentTypesContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toEqual(['barbell', 'dumbbell'])
  })

  it('returns an empty array when no equipment rows exist', async () => {
    const supabase = stubSupabase({ exercises: [] })
    const res = await runRoute({
      contract: equipmentTypesContract,
      method: 'GET',
      handler: getEquipmentTypes,
      isPublic: true,
      supabase,
    })
    expect(res.status).toBe(200)
    const parsed = equipmentTypesContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toEqual([])
  })
})
