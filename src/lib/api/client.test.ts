import { describe, expect, it } from 'vitest'
import { buildSearchParams, readApiData, readApiSuccess } from './client'

describe('api client helpers', () => {
  it('reads data from successful API envelopes', async () => {
    const response = Response.json({
      success: true,
      data: { id: 'session-1' },
    })

    await expect(readApiData<{ id: string }>(response, 'Fallback error')).resolves.toEqual({
      id: 'session-1',
    })
  })

  it('throws API errors for failed data and success responses', async () => {
    const failedDataResponse = Response.json(
      { success: false, error: 'No session' },
      { status: 404 },
    )
    const failedSuccessResponse = Response.json(
      { success: false, error: 'Delete failed' },
      { status: 500 },
    )

    await expect(readApiData(failedDataResponse, 'Fallback error')).rejects.toThrow('No session')
    await expect(readApiSuccess(failedSuccessResponse, 'Fallback error')).rejects.toThrow(
      'Delete failed',
    )
  })

  it('builds search params while skipping empty values', () => {
    const params = buildSearchParams({
      category_id: ['strength', '', 'mobility'],
      query: 'bench',
      equipment: undefined,
      limit: 20,
      includeDetails: true,
      empty: null,
    })

    expect(params.toString()).toBe(
      'category_id=strength&category_id=mobility&query=bench&limit=20&includeDetails=true',
    )
  })
})
