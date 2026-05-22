import { describe, expect, it } from 'vitest'
import { errorResponse, statusForError, successResponse } from './envelope'
import { BadRequestError, ForbiddenError, NotFoundError } from './errors'

describe('successResponse', () => {
  it('writes the API Envelope success shape with 200', async () => {
    const res = successResponse({ id: 'abc' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    expect(await res.json()).toEqual({ success: true, data: { id: 'abc' } })
  })

  it('merges set-cookie entries from upstream headers', async () => {
    const upstream = new Headers()
    upstream.append('set-cookie', 'sb-a=1; Path=/')
    upstream.append('set-cookie', 'sb-b=2; Path=/')
    const res = successResponse({ ok: true }, upstream)
    const cookies =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.length).toBeGreaterThanOrEqual(2)
  })
})

describe('errorResponse', () => {
  it('writes the API Envelope failure shape with the given status', async () => {
    const res = errorResponse(404, 'gone')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, error: 'gone' })
  })
})

describe('statusForError', () => {
  it('NotFoundError -> 404', () => {
    expect(statusForError(new NotFoundError('x'))).toEqual({ status: 404, message: 'x' })
  })
  it('ForbiddenError -> 403', () => {
    expect(statusForError(new ForbiddenError('x'))).toEqual({ status: 403, message: 'x' })
  })
  it('BadRequestError -> 400', () => {
    expect(statusForError(new BadRequestError('x'))).toEqual({ status: 400, message: 'x' })
  })
  it('unknown -> 500 with generic message', () => {
    expect(statusForError(new Error('leak'))).toEqual({
      status: 500,
      message: 'Internal server error',
    })
  })
})
