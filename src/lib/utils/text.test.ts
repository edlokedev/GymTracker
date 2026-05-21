import { describe, expect, it } from 'vitest'
import { formatExerciseName, toTitleCase } from './text'

describe('text utilities', () => {
  it('formats exercise names in title case', () => {
    expect(formatExerciseName('machine inner chest press')).toBe('Machine Inner Chest Press')
    expect(formatExerciseName('  45° side bend  ')).toBe('45° Side Bend')
    expect(formatExerciseName('ez-bar curl')).toBe('EZ-Bar Curl')
    expect(formatExerciseName('3/4 sit-up')).toBe('3/4 Sit-Up')
  })

  it('collapses repeated whitespace before title casing', () => {
    expect(toTitleCase('cable   one arm   tricep extension')).toBe('Cable One Arm Tricep Extension')
  })
})
