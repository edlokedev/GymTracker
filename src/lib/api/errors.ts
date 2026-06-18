// Typed errors raised by query modules and translated to HTTP status by the
// route layer. See docs/adrs/0002-route-error-taxonomy-from-postgres-signals.md
// for the durable mapping rationale.
//
// Mapping rules owned here:
//   - PGRST116 (PostgREST "no rows from .single()")     -> NotFoundError -> 404
//   - 23503    (Postgres foreign_key_violation)         -> NotFoundError -> 404
//                Collapsed to NotFound on purpose: a parent that is
//                missing-vs-RLS-hidden must be indistinguishable to the
//                caller. Distinguishing leaks ownership.
//   - 42501    (Postgres insufficient_privilege; RLS    -> NotFoundError -> 404
//                on mutation)
//                Default-collapsed to NotFound: in the current schema RLS
//                predicates are pure ownership, so a 42501 means "row exists,
//                not yours" — surfacing 403 would leak existence. Future
//                state-based policies (e.g. "can't edit a completed workout")
//                can throw ForbiddenError directly from the query module to
//                opt back into 403.
//   - 42P01    (Postgres undefined_table)               -> BadRequestError -> 400
//                Local/dev database is behind migrations. Do not collapse this
//                to a generic 500 because the UI can tell the operator exactly
//                what to fix.
//   - anything else                                     -> 500 with server log

export class NotFoundError extends Error {
  readonly kind = 'not_found' as const
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  readonly kind = 'forbidden' as const
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class BadRequestError extends Error {
  readonly kind = 'bad_request' as const
  constructor(message = 'Bad request') {
    super(message)
    this.name = 'BadRequestError'
  }
}

// Convenience throwers — route handler bodies use these to short-circuit.
export function notFound(message?: string): never {
  throw new NotFoundError(message)
}

export function forbidden(message?: string): never {
  throw new ForbiddenError(message)
}

export function badRequest(message?: string): never {
  throw new BadRequestError(message)
}

// Shape of a Postgres / PostgREST error as surfaced by @supabase/supabase-js.
// We only read `code` — message is opaque and varies across PostgREST versions.
type PostgresLikeError = { code?: string | null; message?: string | null } | null | undefined

// Inspect an error object from a Supabase query (`.error` on a builder result)
// and translate the known Postgres signals to typed errors. Returns the raw
// error untouched if it doesn't match a known signal, so callers can decide
// whether to throw it as-is (becomes a 500) or wrap it.
export function classifyPostgresError(error: PostgresLikeError): Error | null {
  if (!error || typeof error !== 'object') return null
  const code = error.code ?? undefined
  if (code === 'PGRST116') return new NotFoundError(error.message ?? 'Not found')
  if (code === '23503') return new NotFoundError(error.message ?? 'Not found')
  if (code === '42501') return new NotFoundError(error.message ?? 'Not found')
  if (code === '42P01') {
    return new BadRequestError('Workout template database tables are missing. Run migrations.')
  }
  return null
}

// Helper for query modules. Replaces the pattern:
//
//   if (error) throw error
//
// with:
//
//   assertPostgresOk(error)
//
// which raises a typed error for known signals and rethrows raw otherwise.
export function assertPostgresOk(error: PostgresLikeError): void {
  if (!error) return
  const typed = classifyPostgresError(error)
  if (typed) throw typed
  // Unknown signal — rethrow so the route layer logs it and returns 500.
  throw error
}
