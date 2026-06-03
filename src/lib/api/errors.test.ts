import { describe, expect, it } from 'vitest'
import {
  assertPostgresOk,
  BadRequestError,
  badRequest,
  classifyPostgresError,
  ForbiddenError,
  forbidden,
  NotFoundError,
  notFound,
} from './errors'

void ForbiddenError // referenced for re-export validation

describe('classifyPostgresError', () => {
  it('returns null for nullish or non-object input', () => {
    expect(classifyPostgresError(null)).toBeNull()
    expect(classifyPostgresError(undefined)).toBeNull()
  })

  it('maps PGRST116 to NotFoundError', () => {
    const e = classifyPostgresError({ code: 'PGRST116', message: 'No rows' })
    expect(e).toBeInstanceOf(NotFoundError)
    expect(e?.message).toBe('No rows')
  })

  it('maps 23503 to NotFoundError (collapses ownership info-leak)', () => {
    const e = classifyPostgresError({ code: '23503', message: 'fk violation' })
    expect(e).toBeInstanceOf(NotFoundError)
  })

  it('maps 42501 to NotFoundError (collapsed: ownership-only RLS predicate)', () => {
    const e = classifyPostgresError({ code: '42501', message: 'denied' })
    expect(e).toBeInstanceOf(NotFoundError)
  })

  it('maps missing migration tables to an actionable bad request', () => {
    const e = classifyPostgresError({ code: '42P01', message: 'relation does not exist' })
    expect(e).toBeInstanceOf(BadRequestError)
    expect(e?.message).toBe('Workout template database tables are missing. Run migrations.')
  })

  it('returns null for unknown codes', () => {
    expect(classifyPostgresError({ code: '99999', message: 'who knows' })).toBeNull()
  })
})

describe('assertPostgresOk', () => {
  it('returns silently on null', () => {
    expect(() => assertPostgresOk(null)).not.toThrow()
  })

  it('throws NotFoundError for PGRST116', () => {
    expect(() => assertPostgresOk({ code: 'PGRST116' })).toThrow(NotFoundError)
  })

  it('throws NotFoundError for 42501 (collapsed)', () => {
    expect(() => assertPostgresOk({ code: '42501' })).toThrow(NotFoundError)
  })

  it('rethrows raw error for unknown codes (so route returns 500)', () => {
    const raw = { code: 'XX000', message: 'oops' }
    expect(() => assertPostgresOk(raw)).toThrow()
  })
})

describe('thrower helpers', () => {
  it('notFound throws NotFoundError with the given message', () => {
    expect(() => notFound('gone')).toThrow(NotFoundError)
    try {
      notFound('gone')
    } catch (e) {
      expect((e as Error).message).toBe('gone')
    }
  })

  it('forbidden throws ForbiddenError', () => {
    expect(() => forbidden()).toThrow(ForbiddenError)
  })

  it('badRequest throws BadRequestError', () => {
    expect(() => badRequest('bad')).toThrow(BadRequestError)
  })
})
