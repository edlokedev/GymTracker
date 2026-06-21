import { describe, expect, it } from 'vitest'
import {
  customExerciseId,
  emptyCustomExerciseDraft,
  isCustomExerciseId,
  normalizeCustomExerciseDraft,
  validateCustomExerciseDraft,
} from './custom-exercise'

describe('custom exercise model', () => {
  it('generates ids under the custom- namespace', () => {
    const id = customExerciseId()
    expect(id.startsWith('custom-')).toBe(true)
    expect(isCustomExerciseId(id)).toBe(true)
    expect(isCustomExerciseId('barbell-bench-press')).toBe(false)
    // unique per call
    expect(customExerciseId()).not.toBe(customExerciseId())
  })

  it('accepts a minimal valid draft (name + category + tracking type)', () => {
    const result = validateCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: ' Pendlay Row ',
      categoryId: 'strength',
      trackingType: 'strength',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // name is trimmed in the normalized payload
      expect(result.value.name).toBe('Pendlay Row')
      expect(result.value.category_id).toBe('strength')
      expect(result.value.tracking_type).toBe('strength')
    }
  })

  it('rejects a blank name', () => {
    const result = validateCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: '   ',
      categoryId: 'strength',
      trackingType: 'strength',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBeTruthy()
  })

  it('rejects a name longer than 120 chars', () => {
    const result = validateCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: 'x'.repeat(121),
      categoryId: 'strength',
      trackingType: 'strength',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBeTruthy()
  })

  it('requires a category', () => {
    const result = validateCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: 'Pendlay Row',
      categoryId: '',
      trackingType: 'strength',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.categoryId).toBeTruthy()
  })

  it('rejects an unknown tracking type', () => {
    const result = validateCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: 'Pendlay Row',
      categoryId: 'strength',
      trackingType: 'plyometric' as never,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.trackingType).toBeTruthy()
  })

  it('normalizes optional details: trims, drops blanks, lowercases muscles/equipment', () => {
    const payload = normalizeCustomExerciseDraft({
      name: '  Cable Fly  ',
      categoryId: 'strength',
      trackingType: 'strength',
      equipment: '  Cable ',
      primaryMuscles: [' Chest ', '', 'chest'],
      secondaryMuscles: ['Shoulders'],
      instructions: [' Set up ', '', 'Pull across'],
      gifPath: '',
      previewImagePath: '',
    })
    expect(payload).toEqual({
      name: 'Cable Fly',
      category_id: 'strength',
      tracking_type: 'strength',
      equipment: 'cable',
      primary_muscles: ['chest'],
      secondary_muscles: ['shoulders'],
      instructions: ['Set up', 'Pull across'],
      gif_path: null,
      preview_image_path: null,
    })
  })

  it('treats whitespace-only optional fields as absent', () => {
    const payload = normalizeCustomExerciseDraft({
      ...emptyCustomExerciseDraft,
      name: 'Pendlay Row',
      categoryId: 'strength',
      trackingType: 'strength',
    })
    expect(payload.equipment).toBeNull()
    expect(payload.primary_muscles).toEqual([])
    expect(payload.secondary_muscles).toEqual([])
    expect(payload.instructions).toEqual([])
    expect(payload.gif_path).toBeNull()
    expect(payload.preview_image_path).toBeNull()
  })
})
