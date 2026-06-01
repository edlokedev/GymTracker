import { describe, expect, it } from 'vitest'
import { getTrackingType, normalizeTrackingType } from './exercise-tracking'

describe('exercise tracking type', () => {
  it('prefers explicit tracking metadata over category fallback', () => {
    expect(getTrackingType({ trackingType: 'cardio', categoryName: 'Back', force: null })).toBe(
      'cardio',
    )
  })

  it('falls back to cardio category when metadata is absent', () => {
    expect(getTrackingType({ categoryName: 'Cardio', force: null })).toBe('cardio')
  })

  it('treats static force as timed when metadata is absent', () => {
    expect(getTrackingType({ categoryName: 'Waist', force: 'static' })).toBe('timed')
  })

  it('rejects unknown explicit tracking metadata', () => {
    expect(normalizeTrackingType('distance')).toBeNull()
  })
})
