import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineContract } from '../../src/lib/api/define-contract'
import { badRequest } from '../../src/lib/api/errors'
import { runRoute } from './run-route'

const testContract = defineContract({
  path: '/api/test-contract',
  methods: {
    GET: {
      response: z.object({ id: z.string() }),
    },
  },
})

describe('runRoute contract validation', () => {
  it('accepts a successful envelope whose data matches the route contract', async () => {
    const res = await runRoute({
      contract: testContract,
      method: 'GET',
      isPublic: true,
      handler: () => ({ id: 'ok' }),
      supabase: {},
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { id: 'ok' } })
  })

  it('rejects a successful envelope whose data violates the route contract', async () => {
    await expect(
      runRoute({
        contract: testContract,
        method: 'GET',
        isPublic: true,
        handler: () => ({ id: 123 }),
        supabase: {},
      }),
    ).rejects.toThrow()
  })

  it('accepts a typed error envelope without parsing it as success data', async () => {
    const res = await runRoute({
      contract: testContract,
      method: 'GET',
      isPublic: true,
      handler: () => badRequest('bad input'),
      supabase: {},
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ success: false, error: 'bad input' })
  })

  it('rejects route invocations without a matching method contract', async () => {
    await expect(
      runRoute({
        contract: testContract,
        method: 'POST',
        isPublic: true,
        handler: () => ({ id: 'ok' }),
        supabase: {},
      }),
    ).rejects.toThrow('No POST contract defined for /api/test-contract')
  })
})
