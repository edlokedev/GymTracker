// privateMethod — handler wrapper for private API routes. Concentrates the
// auth gate, cookie merge, JSON envelope, and typed-error → HTTP-status
// mapping that every private route used to re-implement.
//
// The TanStack file router does static AST analysis on `src/routes/api.*.ts`
// and requires the literal `createServerFileRoute('/api/...').methods({...})`
// call to be present in the route file. So this module exports a per-handler
// wrapper rather than a per-route wrapper:
//
//   export const ServerRoute = createServerFileRoute('/api/workout-sessions').methods({
//     GET:  privateMethod(async ({ user, supabase, url }) => { ... }),
//     POST: privateMethod(async ({ user, supabase, request }) => { ... }),
//   })
//
// Identity is ALWAYS derived from the Supabase session on the request.
// Handlers receive `user` as a non-null Supabase User; the auth gate
// guarantees that. `userId` from query string or body is never trusted.
//
// To short-circuit with a typed HTTP status, throw via `notFound()`,
// `badRequest()`, `forbidden()` from `./errors`, or let a NotFoundError /
// ForbiddenError / BadRequestError raised by a query module bubble up.

import type { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import type { Database } from '../supabase/database.types'
import { getAuthenticatedUser } from '../supabase/server'
import { mergeHeaders } from './cookies'
import { errorResponse, statusForError, successResponse } from './envelope'

type SB = ReturnType<typeof createServerClient<Database>>

export interface PrivateHandlerContext {
  user: User
  supabase: SB
  request: Request
  url: URL
  params: Record<string, string>
}

export type PrivateHandler<T> = (ctx: PrivateHandlerContext) => Promise<T> | T

export interface AuthResolution {
  user: User | null
  supabase: SB
  responseHeaders: Headers
}

export type AuthResolver = (request: Request) => Promise<AuthResolution>

// Pure factory: returns the wrapped function TanStack's file router invokes.
// Auth-resolver and label are injectable so tests can run without touching
// the Supabase SSR module. Pass extraHeaders to add route-specific response
// headers (e.g. { 'Cache-Control': 'private, no-store' }).
export function makePrivateMethod(
  handler: PrivateHandler<unknown>,
  authResolver: AuthResolver = getAuthenticatedUser,
  errorLogLabel = 'private route',
  extraHeaders?: Record<string, string>,
) {
  return async ({
    request,
    params,
  }: {
    request: Request
    params?: Record<string, string>
  }): Promise<Response> => {
    const { user, supabase, responseHeaders } = await authResolver(request)
    if (!user) {
      return errorResponse(401, 'Unauthorized', mergeHeaders(responseHeaders))
    }
    const url = new URL(request.url)
    try {
      const data = await handler({
        user,
        supabase,
        request,
        url,
        params: params ?? {},
      })
      if (extraHeaders) {
        for (const [k, v] of Object.entries(extraHeaders)) responseHeaders.set(k, v)
      }
      return successResponse(data, responseHeaders)
    } catch (err) {
      const { status, message } = statusForError(err)
      if (status >= 500) console.error(`${errorLogLabel} error:`, err)
      return errorResponse(status, message, mergeHeaders(responseHeaders))
    }
  }
}

// The route-file-facing convenience: defaults the resolver to the real
// Supabase one. Tests use makePrivateMethod with an injected resolver.
// Pass `extraHeaders` to set additional response headers (e.g. Cache-Control).
export function privateMethod<T>(
  handler: PrivateHandler<T>,
  options?: { extraHeaders?: Record<string, string> },
) {
  const { extraHeaders } = options ?? {}
  return makePrivateMethod(handler as PrivateHandler<unknown>, undefined, undefined, extraHeaders)
}
