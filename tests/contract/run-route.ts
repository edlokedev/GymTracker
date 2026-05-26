// runRoute — test harness that invokes a bare route handler through the
// same private/public method wrapper used in production, but with an
// injected auth resolver so no Supabase SSR client is constructed.
//
// Each route file exports its bare handler (e.g. `getEquipmentTypes`),
// alongside the TanStack-wrapped ServerRoute. Tests pass that bare handler
// in via the `handler` field.

import type { User } from '@supabase/supabase-js'
import { makePrivateMethod } from '../../src/lib/api/define-private-route'
import { makePublicMethod } from '../../src/lib/api/define-public-route'

type RunRouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type ContractResponseSchema = { parse: (input: unknown) => unknown }

interface RunRouteContract {
  path: string
  methods: Partial<
    Record<
      RunRouteMethod,
      {
        response: ContractResponseSchema
      }
    >
  >
}

export interface RunRouteOptions {
  // The contract binds the test to a path/method and validates successful
  // response payloads against the route's declared schema.
  contract: RunRouteContract
  method: RunRouteMethod
  handler: (ctx: any) => unknown
  // Marks the route as public (skip auth gate). Default is private.
  isPublic?: boolean
  query?: Record<string, string | string[] | undefined>
  body?: unknown
  user?: User | null
  // biome-ignore lint/suspicious/noExplicitAny: stub client shape
  supabase: any
}

export interface RunRouteResult {
  status: number
  headers: Headers
  body: any
}

function buildUrl(path: string, query?: Record<string, string | string[] | undefined>): string {
  const url = new URL(`http://test${path}`)
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val == null) continue
      if (Array.isArray(val)) for (const v of val) url.searchParams.append(key, v)
      else url.searchParams.set(key, val)
    }
  }
  return url.toString()
}

function assertContractMethod(contract: RunRouteContract, method: RunRouteMethod) {
  const methodContract = contract.methods[method]
  if (!methodContract) {
    throw new Error(`No ${method} contract defined for ${contract.path}`)
  }
  return methodContract
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function validateResponseEnvelope(opts: RunRouteOptions, status: number, body: unknown): void {
  const methodContract = assertContractMethod(opts.contract, opts.method)
  const isSuccess = status >= 200 && status < 300

  if (!body || typeof body !== 'object') {
    throw new Error(`Expected ${opts.method} ${opts.contract.path} to return an API envelope`)
  }

  const envelope = body as { success?: unknown; data?: unknown; error?: unknown }

  if (!isSuccess) {
    if (envelope.success !== false || typeof envelope.error !== 'string') {
      throw new Error(
        `Expected ${opts.method} ${opts.contract.path} error response to return { success: false, error: string }`,
      )
    }
    return
  }

  if (envelope.success !== true || !('data' in envelope)) {
    throw new Error(
      `Expected ${opts.method} ${opts.contract.path} success response to return { success: true, data }`,
    )
  }

  methodContract.response.parse(envelope.data)
}

export async function runRoute(opts: RunRouteOptions): Promise<RunRouteResult> {
  assertContractMethod(opts.contract, opts.method)
  const url = buildUrl(opts.contract.path, opts.query)
  const init: RequestInit = { method: opts.method }
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  const request = new Request(url, init)

  if (opts.isPublic) {
    const run = makePublicMethod(
      opts.handler as any,
      () => ({ supabase: opts.supabase, responseHeaders: new Headers() }),
      `TEST ${opts.method} ${opts.contract.path}`,
    )
    const res = await run({ request })
    const body = await parseResponseBody(res)
    validateResponseEnvelope(opts, res.status, body)
    return {
      status: res.status,
      headers: res.headers,
      body,
    }
  }

  const run = makePrivateMethod(
    opts.handler as any,
    async () => ({
      user: opts.user ?? null,
      supabase: opts.supabase,
      responseHeaders: new Headers(),
    }),
    `TEST ${opts.method} ${opts.contract.path}`,
  )
  const res = await run({ request })
  const body = await parseResponseBody(res)
  validateResponseEnvelope(opts, res.status, body)
  return {
    status: res.status,
    headers: res.headers,
    body,
  }
}

// Convenience for a stubbed user.
export const fakeUser = { id: 'user-1', email: 'test@example.com' } as unknown as User
