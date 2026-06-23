// The API Envelope: every JSON API route (private and public) serializes
// through this. Redirect routes (e.g. /auth/callback) are deliberately
// outside the envelope.
//
// Success: { success: true,  data: T }
// Error:   { success: false, error: string }
//
// Clients in src/features/*/client.ts read responses through
// src/lib/api/client.ts which treats `success`, `data`, `error` as optional
// and triggers an error when `!response.ok` OR `success === false`. The
// envelope below is a strict superset of what the client tolerates.

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from './errors'

export type ApiSuccess<T> = { success: true; data: T }
export type ApiFailure = { success: false; error: string }
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

export function jsonResponse(
  body: ApiEnvelope<unknown>,
  init: { status?: number; headers?: Headers } = {},
): Response {
  const headers = init.headers ? new Headers(init.headers) : new Headers()
  for (const [k, v] of Object.entries(JSON_HEADERS)) headers.set(k, v)
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  })
}

export function successResponse<T>(data: T, headers?: Headers): Response {
  return jsonResponse({ success: true, data }, { status: 200, headers })
}

export function errorResponse(status: number, error: string, headers?: Headers): Response {
  return jsonResponse({ success: false, error }, { status, headers })
}

// Map a thrown value to (status, message). Unknown errors collapse to 500
// with the error logged by the caller.
export function statusForError(err: unknown): { status: number; message: string } {
  if (err instanceof NotFoundError) return { status: 404, message: err.message }
  if (err instanceof ForbiddenError) return { status: 403, message: err.message }
  if (err instanceof BadRequestError) return { status: 400, message: err.message }
  if (err instanceof ConflictError) return { status: 409, message: err.message }
  return { status: 500, message: 'Internal server error' }
}
