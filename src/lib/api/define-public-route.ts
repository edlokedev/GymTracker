// publicMethod — handler wrapper for public API routes (no auth gate;
// catalog reads). Mirrors privateMethod minus the gate, so the per-route
// file shape stays uniform.
//
// Route-file usage:
//
//   export const ServerRoute = createServerFileRoute('/api/equipment-types').methods({
//     GET: publicMethod(async ({ supabase }) => { ... }),
//   })
//
// To short-circuit with a typed HTTP status, throw via `notFound()`,
// `badRequest()`, `forbidden()` from `./errors`.

import type { createServerClient } from '@supabase/ssr'
import type { Database } from '../supabase/database.types'
import { getSupabaseServerClient } from '../supabase/server'
import { mergeHeaders } from './cookies'
import { errorResponse, statusForError, successResponse } from './envelope'

type SB = ReturnType<typeof createServerClient<Database>>

export interface PublicHandlerContext {
  supabase: SB
  request: Request
  url: URL
  params: Record<string, string>
}

export type PublicHandler<T> = (ctx: PublicHandlerContext) => Promise<T> | T

export interface PublicResolution {
  supabase: SB
  responseHeaders: Headers
}

export type PublicClientResolver = (request: Request) => PublicResolution

export interface PublicMethodOptions {
  // When set, a successful response carries this `Cache-Control` value so
  // browsers/CDN can cache it. Catalog/facet data is effectively static
  // (seeded), so it is safe to cache. Errors are never cached.
  cacheControl?: string
}

// Shared cache policy for the static public Exercise Catalog facets
// (categories, equipment types, muscle groups). Short browser TTL, long CDN
// TTL with stale-while-revalidate so a reseed propagates without a cold miss.
export const CATALOG_CACHE_CONTROL =
  'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'

export function makePublicMethod(
  handler: PublicHandler<unknown>,
  clientResolver: PublicClientResolver = getSupabaseServerClient,
  errorLogLabel = 'public route',
  options: PublicMethodOptions = {},
) {
  return async ({
    request,
    params,
  }: {
    request: Request
    params?: Record<string, string>
  }): Promise<Response> => {
    const { supabase, responseHeaders } = clientResolver(request)
    const url = new URL(request.url)
    try {
      const data = await handler({ supabase, request, url, params: params ?? {} })
      const headers = options.cacheControl
        ? mergeHeaders(responseHeaders, { 'Cache-Control': options.cacheControl })
        : responseHeaders
      return successResponse(data, headers)
    } catch (err) {
      // Errors are never cached — only the success path gets Cache-Control.
      const { status, message } = statusForError(err)
      if (status >= 500) console.error(`${errorLogLabel} error:`, err)
      return errorResponse(status, message, mergeHeaders(responseHeaders))
    }
  }
}

export function publicMethod<T>(handler: PublicHandler<T>, options?: PublicMethodOptions) {
  return makePublicMethod(handler as PublicHandler<unknown>, undefined, undefined, options)
}
