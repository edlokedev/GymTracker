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

export interface RunRouteOptions {
  // The contract is accepted to bind the test to a specific path / method
  // but is not currently used to validate inputs — the bare handler is the
  // unit under test, and the test body parses the response against the
  // contract explicitly.
  contract: { path: string }
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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

export async function runRoute(opts: RunRouteOptions): Promise<RunRouteResult> {
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
    const text = await res.text()
    return {
      status: res.status,
      headers: res.headers,
      body: text ? JSON.parse(text) : null,
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
  const text = await res.text()
  return {
    status: res.status,
    headers: res.headers,
    body: text ? JSON.parse(text) : null,
  }
}

// Convenience for a stubbed user.
export const fakeUser = { id: 'user-1', email: 'test@example.com' } as unknown as User
