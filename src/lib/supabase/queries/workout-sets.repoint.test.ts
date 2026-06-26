import { describe, expect, it } from 'vitest'
import { BadRequestError, ConflictError, NotFoundError } from '../../api/errors'
import type { AppSupabaseClient } from '../query-client'
import { workoutSetQueries } from './workout-sets'

type RpcCall = { fn: string; args: Record<string, unknown> }

// Minimal fake client exposing rpc() — the repoint path is the repo's first
// .rpc() caller, so it doesn't touch the from()/builder fakes.
function makeRpcClient(result: { data?: unknown; error?: { code?: string; message?: string } }) {
  const calls: RpcCall[] = []
  const client = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args })
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null })
    },
  } as unknown as AppSupabaseClient
  return { client, calls }
}

describe('workoutSetQueries.repointExercise', () => {
  it('calls the RPC with the workout + exercise ids and returns changed set ids', async () => {
    const { client, calls } = makeRpcClient({ data: [{ set_id: 's1' }, { set_id: 's2' }] })

    const result = await workoutSetQueries.repointExercise(client, 'w1', 'from-ex', 'to-ex')

    expect(result).toEqual({ repointed: 2, setIds: ['s1', 's2'] })
    expect(calls).toEqual([
      {
        fn: 'repoint_workout_exercise',
        args: { p_workout_id: 'w1', p_from: 'from-ex', p_to: 'to-ex' },
      },
    ])
  })

  it('maps GYM03 (target already in workout) to ConflictError', async () => {
    const { client } = makeRpcClient({ error: { code: 'GYM03', message: 'already logged' } })
    await expect(workoutSetQueries.repointExercise(client, 'w1', 'a', 'b')).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('maps GYM04 (stale/missing source or workout) to NotFoundError', async () => {
    const { client } = makeRpcClient({ error: { code: 'GYM04', message: 'not found' } })
    await expect(workoutSetQueries.repointExercise(client, 'w1', 'a', 'b')).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('maps GYM02 (archived/unknown target) to BadRequestError', async () => {
    const { client } = makeRpcClient({ error: { code: 'GYM02', message: 'unavailable' } })
    await expect(workoutSetQueries.repointExercise(client, 'w1', 'a', 'b')).rejects.toBeInstanceOf(
      BadRequestError,
    )
  })

  it('maps GYM01 (source == target) to BadRequestError', async () => {
    const { client } = makeRpcClient({ error: { code: 'GYM01', message: 'same' } })
    await expect(workoutSetQueries.repointExercise(client, 'w1', 'a', 'a')).rejects.toBeInstanceOf(
      BadRequestError,
    )
  })
})
