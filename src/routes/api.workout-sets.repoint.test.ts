import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { PrivateHandlerContext } from '../lib/api/define-private-route'
import { ConflictError } from '../lib/api/errors'
import { repointWorkoutExercise } from './api.workout-sets'

const fakeUser = { id: 'user-1' } as unknown as User

function fakeSupabase(
  rpcResult: { data?: unknown; error?: { code?: string; message?: string } } = {},
) {
  return {
    rpc: () => Promise.resolve({ data: rpcResult.data ?? null, error: rpcResult.error ?? null }),
  } as unknown as PrivateHandlerContext['supabase']
}

function ctx(
  search: string,
  rpcResult?: Parameters<typeof fakeSupabase>[0],
): PrivateHandlerContext {
  const url = `http://test/api/workout-sets${search}`
  return {
    user: fakeUser,
    supabase: fakeSupabase(rpcResult),
    request: new Request(url, { method: 'PATCH' }),
    url: new URL(url),
    params: {},
  }
}

describe('PATCH repoint workout exercise', () => {
  it('requires workoutId, fromExerciseId, toExerciseId', async () => {
    await expect(repointWorkoutExercise(ctx('?workoutId=w1'))).rejects.toThrow()
  })

  it('rejects when from === to', async () => {
    await expect(
      repointWorkoutExercise(ctx('?workoutId=w1&fromExerciseId=a&toExerciseId=a')),
    ).rejects.toThrow()
  })

  it('returns the repoint result on success', async () => {
    const result = await repointWorkoutExercise(
      ctx('?workoutId=w1&fromExerciseId=a&toExerciseId=b', {
        data: [{ set_id: 's1' }, { set_id: 's2' }],
      }),
    )
    expect(result).toEqual({ repointed: 2, setIds: ['s1', 's2'] })
  })

  it('surfaces a collision as ConflictError (-> 409)', async () => {
    await expect(
      repointWorkoutExercise(
        ctx('?workoutId=w1&fromExerciseId=a&toExerciseId=b', {
          error: { code: 'GYM03', message: 'already logged' },
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })
})
